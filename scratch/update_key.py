import os

env_paths = [
    "/opt/zayron-app/.env",
    "/opt/zayron-app/workers/.env"
]

new_line = 'GEMINI_API_KEY="AQ.Ab8RN6LKi8_JxBk88TKJT_Qt7w5KmiF334RP41W6I3CrnhDr8g"'

for env_path in env_paths:
    if not os.path.exists(env_path):
        print(f"Skipping: {env_path} does not exist.")
        continue

    updated = False
    lines = []
    with open(env_path, "r") as f:
        for line in f:
            line_strip = line.strip()
            if line_strip.startswith("GEMINI_API_KEY="):
                lines.append(new_line + "\n")
                updated = True
            else:
                lines.append(line)

    if not updated:
        lines.append(new_line + "\n")

    with open(env_path, "w") as f:
        f.writelines(lines)

    print(f"Key updated successfully inside {env_path}.")
