# VajraScan: The Indian Compliance Cloud Guard

[![Build Status](https://github.com/SoumyadeepSaha2005/VajraScan/actions/workflows/main.yml/badge.svg)](https://github.com/SoumyadeepSaha2005/VajraScan/actions)

![Python](https://img.shields.io/badge/Python-3.9-blue)
![Compliance](https://img.shields.io/badge/Compliance-DPDP_Act-orange)
![Event](https://img.shields.io/badge/Event-Cyber_Security_Innovation_Challenge_1.0-green)
![Year](https://img.shields.io/badge/Year-2025--26-blue)

> **"Shift-Left" Multi-Cloud Security Scanner optimized for Indian Regulatory Standards.**

## 📖 Overview
**VajraScan** is an automated Infrastructure-as-Code (IaC) security scanner designed to detect cloud misconfigurations *before* they are deployed.

Unlike global tools, VajraScan is built with a **"Compliance-First"** approach for the Indian market, mapping security failures directly to the **Digital Personal Data Protection (DPDP) Act, 2023** and **RBI Cybersecurity Framework**.

## 🚀 Key Features

* **🇮🇳 Indian Context Awareness:** Maps vulnerabilities like "Public S3 Buckets" directly to DPDP Act (Section 8) violations.
* **☁️ Multi-Cloud Support:** Scans both **AWS** (S3, Security Groups) and **Azure** (Storage Accounts) resources.
* **🛠️ Auto-Remediation:** Doesn't just find errors; suggests the exact Terraform code to fix them.
* **⚡ CI/CD Integration:** Automatically blocks deployment pipelines (GitHub Actions) if insecure code is detected.
* **📊 Interactive Dashboard:** A visual interface built with Streamlit for non-technical auditors.

## 🛠️ Tech Stack
* **Core Engine:** Python (Logic & Parsing)
* **Parsing Library:** `python-hcl2` (Terraform analysis)
* **UI/Dashboard:** Streamlit
* **CI/CD:** GitHub Actions

## 📸 Screenshots

| **Dashboard View** | **Terminal Scan** |
|:---:|:---:|
| *(Add your Streamlit screenshot here)* | *(Add your Terminal screenshot here)* |

## ⚙️ Installation & Usage

### 1. Clone the Repository
```bash
git clone [https://github.com/SoumyadeepSaha2005/VajraScan.git](https://github.com/SoumyadeepSaha2005/VajraScan.git)
cd VajraScan