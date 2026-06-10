import os

proc_dirs = [p for p in os.listdir('/proc') if p.isdigit()]
for p in proc_dirs:
    try:
        with open(f'/proc/{p}/cmdline', 'r') as f:
            cmd = f.read().replace('\x00', ' ')
        if cmd.strip():
            print(f"PID {p}: {cmd}")
    except Exception as e:
        pass
