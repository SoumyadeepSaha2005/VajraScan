# VULNERABLE TERRAFORM DEMO FILE
# Designed to trigger VajraScan alerts for Hackathon Demo

provider "aws" {
  region = "us-east-1"
}

# 1. CRITICAL: Public S3 Bucket (Data Leak Risk)
resource "aws_s3_bucket" "financial_data" {
  bucket = "company-financials-public"
  acl    = "public-read"  # <--- TRIGGER: VajraScan will flag this!
}

# 2. CRITICAL: Open Security Group (Hacking Risk)
resource "aws_security_group" "database_sg" {
  name        = "db-access"
  description = "Allow all traffic"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # <--- TRIGGER: Open to the whole internet!
  }
}

# 3. HIGH: Unencrypted Azure Storage
resource "azurerm_storage_account" "legacy_store" {
  name                     = "oldstorage"
  enable_https_traffic_only = false # <--- TRIGGER: Unencrypted traffic!
}