import streamlit as st
import hcl2
import pandas as pd
import json

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="VajraScan - Cloud Security", page_icon="🛡️", layout="wide")

# --- HEADER ---
st.title("🛡️ VajraScan: Cloud Infrastructure Security")
st.markdown("### Indian Compliance & Misconfiguration Scanner")
st.markdown("---")

# --- RULES ENGINE ---
def check_s3_public(resource_block):
    issues = []
    if 'aws_s3_bucket' in resource_block:
        name = list(resource_block['aws_s3_bucket'].keys())[0]
        conf = resource_block['aws_s3_bucket'][name]
        if conf.get('acl') == 'public-read':
            issues.append({
                "Resource": name,
                "Type": "S3 Bucket",
                "Severity": "CRITICAL",
                "Compliance": "DPDP Act (Section 8)",
                "Fix": 'Change acl = "public-read" to acl = "private"'
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
                        "Resource": name,
                        "Type": "Security Group",
                        "Severity": "HIGH",
                        "Compliance": "ISO 27001 (Network Security)",
                        "Fix": 'Remove "0.0.0.0/0" from cidr_blocks'
                    })
    return issues

# --- SIDEBAR ---
st.sidebar.header("Upload Infrastructure Code")
uploaded_file = st.sidebar.file_uploader("Upload .tf file", type=["tf"])

# --- MAIN LOGIC ---
if uploaded_file is not None:
    st.sidebar.success("File Uploaded Successfully!")
    
    # 1. Read the file as string (Text)
    string_data = uploaded_file.getvalue().decode("utf-8")
    st.code(string_data, language='hcl')

    # 2. Parse and Scan
    try:
        # Step A: Convert binary to text AND fix Windows line endings (\r\n)
        # We replace \r\n with \n to stop the "Unexpected Token" error
        clean_code = uploaded_file.getvalue().decode("utf-8").replace('\r\n', '\n')
        
        # Step B: Use 'loads' (with an 's') because we are loading a String
        data = hcl2.loads(clean_code)
        
        all_issues = []
        if 'resource' in data:
            for resource_block in data['resource']:
                all_issues.extend(check_s3_public(resource_block))
                all_issues.extend(check_security_group_open(resource_block))

        # --- RESULTS DISPLAY ---
        st.subheader("📊 Scan Results")
        
        if all_issues:
            # Metrics
            col1, col2, col3 = st.columns(3)
            col1.metric("Total Issues", len(all_issues), delta_color="inverse")
            col2.metric("Critical Failures", len([x for x in all_issues if x['Severity'] == 'CRITICAL']))
            col3.metric("Compliance Score", "0/100", delta_color="inverse")

            # Dataframe
            df = pd.DataFrame(all_issues)
            st.table(df)

            # Detailed Remediation
            st.subheader("🛠️ Remediation Plan")
            for issue in all_issues:
                with st.expander(f"Fix Issue: {issue['Resource']} ({issue['Severity']})"):
                    st.write(f"**Violation:** {issue['Compliance']}")
                    st.write(f"**Recommended Fix:**")
                    st.code(issue['Fix'], language="bash")
        else:
            st.success("✅ No issues found! Your infrastructure is secure.")

    except Exception as e:
        st.error(f"Error parsing file: {e}")