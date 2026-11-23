import { KERNEL_WASM_BASE64 } from "./kernelWasmBase64";

export interface RustKernelInstance {
  execute(input: any): any;
}

let cachedInstance: RustKernelInstance | null = null;

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function getRustKernelInstance(compiledModule?: WebAssembly.Module): Promise<RustKernelInstance> {
  if (cachedInstance) {
    return cachedInstance;
  }

  let instance: WebAssembly.Instance;
  if (compiledModule) {
    try {
      instance = new WebAssembly.Instance(compiledModule);
    } catch {
      const res = await WebAssembly.instantiate(compiledModule);
      instance = (res as any).instance || (res as any);
    }
  } else {
    let wasmBytes: Uint8Array;
    if (typeof KERNEL_WASM_BASE64 === "string" && KERNEL_WASM_BASE64.length > 0) {
      wasmBytes = base64ToUint8Array(KERNEL_WASM_BASE64);
    } else {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const wasmPath = path.resolve(
        __dirname,
        "../../../../packages/intelligence-kernel/target/wasm32-unknown-unknown/release/kernel_wasm.wasm"
      );
      wasmBytes = fs.readFileSync(wasmPath);
    }
    const res = await WebAssembly.instantiate(wasmBytes);
    // Node's `WebAssembly` typings resolve this overload to the bare `Instance`, while
    // the runtime (and the DOM typings) return the `{ module, instance }` source object.
    // Assert the documented runtime shape rather than the widened overload result.
    instance = (res as unknown as { instance: WebAssembly.Instance }).instance;
  }

  const { kernel_alloc, kernel_dealloc, kernel_execute_wasm, memory } = instance.exports as any;

  cachedInstance = {
    execute(inputObj: any) {
      const inputStr = JSON.stringify(inputObj);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(inputStr);

      const inPtr = kernel_alloc(encoded.length);
      new Uint8Array(memory.buffer, inPtr, encoded.length).set(encoded);

      const outPtr = kernel_execute_wasm(inPtr, encoded.length);
      kernel_dealloc(inPtr, encoded.length);

      if (!outPtr) {
        throw new Error("Rust Kernel WASM invocation returned a null pointer");
      }

      const memView = new Uint8Array(memory.buffer, outPtr);
      let outLen = 0;
      while (memView[outLen] !== 0) {
        outLen++;
      }

      const decoder = new TextDecoder();
      const outStr = decoder.decode(new Uint8Array(memory.buffer, outPtr, outLen));
      kernel_dealloc(outPtr, outLen + 1);

      return JSON.parse(outStr);
    },
  };

  return cachedInstance;
}
