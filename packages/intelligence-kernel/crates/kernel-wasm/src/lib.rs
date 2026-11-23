//! Safe Serialized JSON Interface for WASM and Host Orchestration.
//!
//! SAFETY INVARIANT: Unsafe code is strictly isolated to this FFI bridge
//! for raw memory layout and pointer exchanges across the WebAssembly boundary.
//! Domain logic in `kernel-types` and `kernel-core` retains `#![forbid(unsafe_code)]`.
#![allow(unsafe_code)]

use kernel_core::execute_kernel;
use kernel_types::{KernelInput, KernelOutput, LifecycleState, ObjectId, SchemaVersion};

use core::alloc::Layout;
use std::alloc::{alloc, dealloc};
use std::os::raw::c_char;

/// Pure, safe serialized interface. Accepts JSON String, returns deterministic JSON String.
#[unsafe(no_mangle)]
pub fn process_kernel_request_json(input_json: &str) -> String {
    let parse_result: Result<KernelInput, _> = serde_json::from_str(input_json);

    let output = match parse_result {
        Ok(input) => execute_kernel(input),
        Err(err) => KernelOutput {
            kernel_version: kernel_core::KERNEL_VERSION.to_string(),
            schema_version: SchemaVersion::new("v1.0"),
            request_id: "malformed_request".to_string(),
            object_id: ObjectId::new("unknown"),
            success: false,
            lifecycle_state: LifecycleState::Rejected,
            claim_validations: vec![],
            errors: vec![format!("Schema Deserialization Failure: {}", err)],
            warnings: vec![],
            conflicts: vec![],
            unknowns: vec![],
            limitations: vec![],
        },
    };

    serde_json::to_string(&output).unwrap_or_else(|_| {
        "{\"success\":false,\"errors\":[\"Output Serialization Error\"]}".to_string()
    })
}

/// Maximum allowed input size to prevent memory exhaustion (8 MiB)
const MAX_KERNEL_INPUT_LEN: usize = 8 * 1024 * 1024;

/// Allocate memory inside the WASM instance for host input strings.
///
/// SAFETY: The host must call `kernel_dealloc` with the exact same pointer and length.
#[unsafe(no_mangle)]
pub extern "C" fn kernel_alloc(len: usize) -> *mut u8 {
    if len == 0 || len > MAX_KERNEL_INPUT_LEN {
        return core::ptr::null_mut();
    }
    let layout = match Layout::from_size_align(len, 1) {
        Ok(l) => l,
        Err(_) => return core::ptr::null_mut(),
    };
    unsafe { alloc(layout) }
}

/// Deallocate memory inside the WASM instance.
///
/// # Safety
///
/// `ptr` must have been allocated via `kernel_alloc` with layout `Layout::from_size_align(len, 1)`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn kernel_dealloc(ptr: *mut u8, len: usize) {
    if ptr.is_null() || len == 0 || len > MAX_KERNEL_INPUT_LEN {
        return;
    }
    if let Ok(layout) = Layout::from_size_align(len, 1) {
        // SAFETY: caller guarantees ptr was allocated via kernel_alloc
        unsafe { dealloc(ptr, layout) };
    }
}

/// Invocation entrypoint: accepts pointer and length of UTF-8 JSON request,
/// processes it deterministically, and returns a pointer to a newly allocated
/// null-terminated JSON C-string result.
///
/// # Safety
///
/// `ptr` must be non-null and point to a valid readable buffer of `len` bytes for the duration of the call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn kernel_execute_wasm(ptr: *const u8, len: usize) -> *mut c_char {
    if ptr.is_null() || len == 0 || len > MAX_KERNEL_INPUT_LEN {
        return core::ptr::null_mut();
    }
    // SAFETY: caller guarantees ptr points to a valid buffer of len bytes
    let input_slice = unsafe { core::slice::from_raw_parts(ptr, len) };
    let input_str = match core::str::from_utf8(input_slice) {
        Ok(s) => s,
        Err(_) => return core::ptr::null_mut(),
    };

    let result_json = process_kernel_request_json(input_str);
    let mut bytes = result_json.into_bytes();
    bytes.push(0); // null terminator

    let out_len = bytes.len();
    let out_ptr = kernel_alloc(out_len) as *mut c_char;
    if !out_ptr.is_null() {
        unsafe {
            core::ptr::copy_nonoverlapping(bytes.as_ptr() as *const c_char, out_ptr, out_len);
        }
    }
    out_ptr
}
