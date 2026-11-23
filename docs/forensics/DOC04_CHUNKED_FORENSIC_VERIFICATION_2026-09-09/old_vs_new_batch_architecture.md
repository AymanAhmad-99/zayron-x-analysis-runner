# Old versus new

The old 10,000-object path sent one huge request and one huge D1 batch, previously returning 502 after about 41 seconds. The new path bounds each HTTP request to one caller-supplied chunk and limits each D1 batch to 500 objects/1,500 statements, but does not yet provide durable payload recovery or stale-runner recovery.
