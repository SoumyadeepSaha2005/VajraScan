import hcl2
import sys
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

# --- RULES ENGINE (Same as before) ---
def check_s3_public(resource_block):
    issues = []
    if 'aws_s3_bucket' in resource_block:
        name = list(resource_block['aws_s3_bucket'].keys())[0]
        conf = resource_block['aws_s3_bucket'][name]
        if conf.get('acl') == 'public-read':
            issues.append({
                "resource": name,
                "type": "S3 Bucket",
                "severity": "CRITICAL",
                "compliance": "DPDP Act (Section 8)",
                "fix": 'Change acl = "public-read" to acl = "private"'
            })
    return issues

def check_security_group_open(resource_block):
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
                        "resource": name,
                        "type": "Security Group",
                        "severity": "HIGH",
                        "compliance": "ISO 27001 (Network Security)",
                        "fix": 'Remove "0.0.0.0/0" from cidr_blocks.'
                    })
    return issues

# --- MAIN LOGIC ---
def scan_file(filename):
    console.print(Panel(f"[bold blue]🚀 Starting VajraScan CI/CD Check: {filename}[/bold blue]"))
    
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            data = hcl2.load(file)
    except Exception as e:
        console.print(f"[bold red]Error reading file: {e}[/bold red]")
        sys.exit(1) # Exit with error

    all_issues = []

    if 'resource' in data:
        for resource_block in data['resource']:
            all_issues.extend(check_s3_public(resource_block))
            all_issues.extend(check_security_group_open(resource_block))

    if all_issues:
        table = Table(title="⚠️  Security Violations Found")
        table.add_column("Resource", style="cyan")
        table.add_column("Severity", style="red")
        table.add_column("Compliance Violation", style="magenta")
        table.add_column("Suggested Fix", style="green")

        for issue in all_issues:
            table.add_row(issue['resource'], issue['severity'], issue['compliance'], issue['fix'])
        
        console.print(table)
        console.print(f"\n[bold red]❌ CI/CD PIPELINE FAILED: {len(all_issues)} Security Issues Found.[/bold red]")
        sys.exit(1) # <--- THIS STOPS THE PIPELINE
    else:
        console.print("[bold green]✅ Scan Passed: Infrastructure is Secure.[/bold green]")
        sys.exit(0) # Success

if __name__ == "__main__":
    scan_file("main.tf")