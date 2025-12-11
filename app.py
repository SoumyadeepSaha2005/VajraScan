import streamlit as st
import hcl2
import pandas as pd

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="VajraScan - Multi-Cloud Security", page_icon="🛡️", layout="wide")

# --- HEADER ---
st.title("🛡️ VajraScan: Cloud Infrastructure Security")
st.markdown("### Indian Compliance & Misconfiguration Scanner (Multi-Cloud)")
st.markdown("---")

# --- RULES ENGINE (Updated for Multi-Cloud) ---

def check_aws_s3(resource_block):
    issues = []
    if 'aws_s3_bucket' in resource_block:
        name = list(resource_block['aws_s3_bucket'].keys())[0]
        conf = resource_block['aws_s3_bucket'][name]
        if conf.get('acl') == 'public-read':
            issues.append({
                "Cloud": "AWS",
                "Resource": name,
                "Type": "S3 Bucket",
                "Severity": "CRITICAL",
                "Compliance": "DPDP Act (Section 8)",
                "Fix": 'Change acl = "public-read" to acl = "private"'
            })
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
                    issues.append({
                        "Cloud": "AWS",
                        "Resource": name,
                        "Type": "Security Group",
                        "Severity": "HIGH",
                        "Compliance": "ISO 27001 (Network Security)",
                        "Fix": 'Remove "0.0.0.0/0" from cidr_blocks'
                    })
    return issues

def check_azure_storage(resource_block):
    issues = []
    if 'azurerm_storage_account' in resource_block:
        name = list(resource_block['azurerm_storage_account'].keys())[0]
        conf = resource_block['azurerm_storage_account'][name]
        
        # Check if HTTPS is enforced (If missing or set to false)
        if conf.get('enable_https_traffic_only') is False:
            issues.append({
                "Cloud": "AZURE",
                "Resource": name,
                "Type": "Storage Account",
                "Severity": "MEDIUM",
                "Compliance": "NIST 800-53 (SC-8)",
                "Fix": 'Set enable_https_traffic_only = true'
            })
    return issues

# --- SIDEBAR ---
st.sidebar.header("Upload Infrastructure Code")
uploaded_file = st.sidebar.file_uploader("Upload .tf file", type=["tf"])

# --- MAIN LOGIC ---
if uploaded_file is not None:
    st.sidebar.success("File Uploaded Successfully!")
    
    # 1. Read and Clean File
    string_data = uploaded_file.getvalue().decode("utf-8")
    st.code(string_data, language='hcl')
    
    # Fix Windows newlines just in case
    clean_code = string_data.replace('\r\n', '\n')

    # 2. Parse and Scan
    try:
        data = hcl2.loads(clean_code)
        
        all_issues = []
        if 'resource' in data:
            for resource_block in data['resource']:
                # Run ALL Rules (AWS + Azure)
                all_issues.extend(check_aws_s3(resource_block))
                all_issues.extend(check_aws_sg(resource_block))
                all_issues.extend(check_azure_storage(resource_block))

        # --- RESULTS DISPLAY ---
        st.subheader("📊 Scan Results")
        
        if all_issues:
            # Metrics
            col1, col2, col3 = st.columns(3)
            col1.metric("Total Issues", len(all_issues), delta_color="inverse")
            col2.metric("Critical Failures", len([x for x in all_issues if x['Severity'] == 'CRITICAL']))
            col3.metric("Cloud Platforms", "AWS & Azure")

            # Dataframe
            df = pd.DataFrame(all_issues)
            st.table(df)

            # Detailed Remediation
            st.subheader("🛠️ Remediation Plan")
            for issue in all_issues:
                with st.expander(f"Fix {issue['Cloud']} Issue: {issue['Resource']} ({issue['Severity']})"):
                    st.write(f"**Violation:** {issue['Compliance']}")
                    st.write(f"**Recommended Fix:**")
                    st.code(issue['Fix'], language="hcl")
        else:
            st.success("✅ No issues found! Your infrastructure is secure.")

    except Exception as e:
        st.error(f"Error parsing file: {e}")

else:
    st.info("👈 Please upload a Terraform (.tf) file from the sidebar to start scanning.")