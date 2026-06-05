#!/usr/bin/env python3
import os

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    report_parts_dir = os.path.join(base_dir, "docs", "audit_report")
    output_file = os.path.join(base_dir, "DEEP_INSPECTION_REPORT.md")
    
    parts = [
        "intro.md",
        "domain1.md",
        "domain2.md",
        "domain3.md",
        "domain4.md",
        "domain5.md",
        "domain6.md",
        "domain7.md",
        "domain8.md",
        "domain9.md",
        "domain10.md",
        "file_audit.md",
        "outro.md"
    ]
    
    merged_content = []
    
    print("Starting compilation of DEEP_INSPECTION_REPORT.md...")
    
    for part in parts:
        part_path = os.path.join(report_parts_dir, part)
        if not os.path.exists(part_path):
            print(f"Error: Part file missing: {part_path}")
            return
        
        print(f"Reading {part}...")
        with open(part_path, "r", encoding="utf-8") as f:
            content = f.read()
            merged_content.append(content)
            
    # Join parts with spacing and separator
    separator = "\n\n---\n\n"
    final_text = separator.join(merged_content)
    
    # Calculate word count (split by whitespace)
    word_count = len(final_text.split())
    print(f"Compiled report word count: {word_count} words")
    
    # Write to target path
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(final_text)
        
    print(f"Success! Monolithic report written to: {output_file}")

if __name__ == "__main__":
    main()
