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