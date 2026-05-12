# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Security Features
- onlyOwner modifier on all sensitive functions
- Contribution cap at goal amount
- Automatic refunds on cancellation
- No external contract calls
- Reentrancy safe transfer pattern

## Reporting a Vulnerability
Please open an issue on GitHub if you find a vulnerability.

## V2 Security Additions
- Secret stored as keccak256 hash, never plaintext
- Deadline enforced at contract level
- Private wishes reject public funding calls
- Anyone can trigger expired refunds trustlessly
