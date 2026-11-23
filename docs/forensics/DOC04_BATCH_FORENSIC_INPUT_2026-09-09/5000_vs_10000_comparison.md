# 5,000 vs 10,000 Comparison

| Metric | 5,000 | 10,000 |
|---|---:|---:|
| Objects | 5,000 | 10,000 |
| Payload size | 2,403,133 bytes | 4,838,141 bytes |
| Parameters | 110,000 object parameters | 220,000 object parameters |
| SQL statements | 15,000 object statements | 30,000 object statements |
| D1 execution count | 1 object batch plus claim/final updates | 1 object batch attempt plus claim; final success not reached |
| Transaction size | one large D1 batch | one larger D1 batch attempt |
| Worker execution time | 11,472 ms | UNKNOWN; request failed |
| Request duration | 12,082 ms | 41,069 ms |
| Memory | UNKNOWN | UNKNOWN |
| Response | HTTP 200 | HTTP 502 |
| Rows written | 5,000 V3 plus 5,000 FTS projections | 0 observed |
| FTS rows written | 5,000 | 0 |
| Seed state | SUCCEEDED | RUNNING pre-fix; FAILED behavior added afterward |

The evidence correlates the failure with request/batch scale and runtime duration, but does not prove a single causal platform limit.
