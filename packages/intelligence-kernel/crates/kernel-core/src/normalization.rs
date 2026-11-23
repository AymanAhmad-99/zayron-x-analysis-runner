//! Zero-dependency UTF-8 string normalization and case folding.
#![forbid(unsafe_code)]

/// Normalizes arbitrary text using Unicode lowercase and trimmed whitespace.
/// Pure standard library implementation.
/// Property: normalize_text(normalize_text(x)) == normalize_text(x)
pub fn normalize_text(input: &str) -> String {
    let lower = input.to_lowercase();
    let mut words = lower.split_whitespace();
    let mut result = String::with_capacity(input.len());
    if let Some(first) = words.next() {
        result.push_str(first);
        for word in words {
            result.push(' ');
            result.push_str(word);
        }
    }
    result
}

/// Normalizes technical identifiers (stripping surrounding whitespace and casing safely).
pub fn normalize_identifier(id: &str) -> String {
    id.trim().to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalization_idempotency() {
        let sample = "  CVE-2024-3400   \t PAN-OS   GlobalProtect  ";
        let norm1 = normalize_text(sample);
        let norm2 = normalize_text(&norm1);
        assert_eq!(norm1, norm2);
        assert_eq!(norm1, "cve-2024-3400 pan-os globalprotect");
    }
}
