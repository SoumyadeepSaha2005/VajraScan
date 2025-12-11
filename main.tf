resource "aws_s3_bucket" "financial_data" {
  bucket = "company-financials"
  acl    = "public-read"      # ❌ Error 1: Public Storage
}

resource "aws_security_group" "allow_all" {
  name        = "allow_all_traffic"
  description = "Allow all inbound traffic"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # ❌ Error 2: Open Firewall (The whole world can enter)
  }
}
# --- AZURE RESOURCES (New Support) ---
resource "azurerm_storage_account" "legacy_store" {
  name                     = "legacy-data-store"
  resource_group_name      = "finance-rg"
  location                 = "East US"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # ❌ Error 3: Non-HTTPS traffic allowed (Insecure)
  enable_https_traffic_only = false 
}