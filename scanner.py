import hcl2
import sys
import json
import os

# --- RULES ENGINE ---
def check_aws_s3(resource_block):
    issues = []
    if 'aws_s3_bucket' in resource_block:
        name = list(resource_block['aws_s3_bucket'].keys())[0]
        conf = resource_block['aws_s3_bucket'][name]
        if conf.get('acl') == 'public-read':
            issues.append({"Cloud": "AWS", "Resource": name, "Type": "S3 Bucket", "Severity": "CRITICAL", "Compliance": "DPDP Act (Section 8)", "Fix": 'Change acl = "private"'})
    return issues

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
                    issues.append({"Cloud": "AWS", "Resource": name, "Type": "Security Group", "Severity": "HIGH", "Compliance": "ISO 27001", "Fix": 'Remove "0.0.0.0/0"'})
    return issues

def check_azure_storage(resource_block):
    issues = []
    if 'azurerm_storage_account' in resource_block:
        name = list(resource_block['azurerm_storage_account'].keys())[0]
        conf = resource_block['azurerm_storage_account'][name]
        if conf.get('enable_https_traffic_only') is False:
            issues.append({"Cloud": "AZURE", "Resource": name, "Type": "Storage Account", "Severity": "MEDIUM", "Compliance": "NIST 800-53", "Fix": 'Set enable_https_traffic_only = true'})
    return issues

# --- MAIN LOGIC ---
def scan_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            data = hcl2.load(file)
            
        all_issues = []
        if 'resource' in data:
            for resource_block in data['resource']:
                all_issues.extend(check_aws_s3(resource_block))
                all_issues.extend(check_aws_sg(resource_block))
                all_issues.extend(check_azure_storage(resource_block))
        
        # Output ONLY JSON for Node.js to capture
        print(json.dumps(all_issues))
        
    except Exception as e:
        # Return error as JSON
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        scan_file(sys.argv[1])
    else:
        print(json.dumps({"error": "No file provided"}))