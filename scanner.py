import hcl2
import sys
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

# --- RULE 1: AWS S3 Public Access ---
def check_aws_s3(resource_block):
    issues = []
    if 'aws_s3_bucket' in resource_block:
        name = list(resource_block['aws_s3_bucket'].keys())[0]
        conf = resource_block['aws_s3_bucket'][name]
        if conf.get('acl') == 'public-read':
            issues.append({
                "platform": "AWS",
                "resource": name,
                "type": "S3 Bucket",
                "severity": "CRITICAL",
                "compliance": "DPDP Act (Section 8)",
                "fix": 'Change acl = "public-read" to acl = "private"'
            })
    return issues

# --- RULE 2: AWS Security Group Open ---
def check_aws_sg(resource_block):
    issues = []
    if 'aws_security_group' in resource_block:
        name = list(resource_block['aws_security_group'].keys())[0]
        conf = resource_block['aws_security_group'][name]
        if 'ingress' in conf:
            ingress_rules = conf['ingress'] if isinstance(conf['ingress'], list) else [conf['ingress']]
            for rule in ingress_rules:
                cidr = rule.get('cidr_blocks', [])
                if "0.0.0.0/0" in str(cidr):
                    issues.append({
                        "platform": "AWS",
                        "resource": name,
                        "type": "Security Group",
                        "severity": "HIGH",
                        "compliance": "ISO 27001 (Network Security)",
                        "fix": 'Remove "0.0.0.0/0" from cidr_blocks.'
                    })
    return issues

# --- RULE 3: AZURE Storage Encryption (NEW!) ---
def check_azure_storage(resource_block):
    issues = []
    if 'azurerm_storage_account' in resource_block:
        name = list(resource_block['azurerm_storage_account'].keys())[0]
        conf = resource_block['azurerm_storage_account'][name]
        
        # Check if HTTPS is enforced
        if conf.get('enable_https_traffic_only') is False:
            issues.append({
                "platform": "AZURE",
                "resource": name,
                "type": "Storage Account",
                "severity": "MEDIUM",
                "compliance": "NIST 800-53 (SC-8) - Data in Transit",
                "fix": 'Set enable_https_traffic_only = true'
            })
    return issues

# --- MAIN LOGIC ---
def scan_file(filename):
    console.print(Panel(f"[bold blue]🚀 Starting VajraScan Multi-Cloud Check: {filename}[/bold blue]"))
    
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            data = hcl2.load(file)
    except Exception as e:
        console.print(f"[bold red]Error reading file: {e}[/bold red]")
        sys.exit(1)

    all_issues = []

    if 'resource' in data:
        for resource_block in data['resource']:
            all_issues.extend(check_aws_s3(resource_block))
            all_issues.extend(check_aws_sg(resource_block))
            all_issues.extend(check_azure_storage(resource_block)) # <-- New Check

    if all_issues:
        table = Table(title="⚠️  Security Violations Found")
        table.add_column("Cloud", style="yellow")
        table.add_column("Resource", style="cyan")
        table.add_column("Severity", style="red")
        table.add_column("Compliance Violation", style="magenta")
        table.add_column("Suggested Fix", style="green")

        for issue in all_issues:
            table.add_row(issue['platform'], issue['resource'], issue['severity'], issue['compliance'], issue['fix'])
        
        console.print(table)
        console.print(f"\n[bold red]❌ PIPELINE FAILED: {len(all_issues)} Issues Found across AWS & Azure.[/bold red]")
        sys.exit(1)
    else:
        console.print("[bold green]✅ Scan Passed: Infrastructure is Secure.[/bold green]")
        sys.exit(0)

if __name__ == "__main__":
    scan_file("main.tf")