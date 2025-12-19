# 🛡️ VajraScan | Enterprise Cloud Security

**VajraScan** is a specialized Infrastructure-as-Code (IaC) security scanner designed to detect cloud misconfigurations in AWS and Azure. Unlike generic scanners, VajraScan is built with **Indian Data Compliance (DPDP Act 2023)** and **ISO 27001** standards in mind.

## 🚀 Key Features
* **Multi-Cloud Support:** Scans both **AWS** (S3, Security Groups) and **Azure** (Storage Accounts).
* **Indian Compliance Logic:** Detects violations specific to the Digital Personal Data Protection Act.
* **Hybrid Architecture:** * **Core Engine:** Python (for robust HCL parsing).
    * **Dashboard:** Node.js & Express (for enterprise-grade scalability).
* **Interactive UI:** Dark-mode dashboard with real-time risk visualization.

## 🛠️ Tech Stack
* **Logic Engine:** Python 3.10, `python-hcl2`
* **Backend API:** Node.js, Express.js
* **Frontend:** HTML5, CSS3 (Glassmorphism), Chart.js
* **Infrastructure:** Terraform (.tf)

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/SoumyadeepSaha2005/VajraScan.git](https://github.com/SoumyadeepSaha2005/VajraScan.git)
cd VajraScan