"""
Simple script to create test users for the expense management system
Run with: python create_test_users.py
"""

import os
import sys
import django

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_management.settings')
django.setup()

from expenses.models import User

def create_test_users():
    """Create test users for different roles"""
    
    # Admin user
    admin_email = "admin@test.com"
    if not User.objects.filter(email=admin_email).exists():
        admin = User.objects.create_user(
            email=admin_email,
            password="admin123",
            first_name="Admin",
            last_name="User",
            role="admin",
            is_active=True
        )
        print(f"✅ Created admin user: {admin_email} / admin123")
    else:
        print(f"ℹ️ Admin user already exists: {admin_email}")
    
    # Manager user
    manager_email = "manager@test.com"
    if not User.objects.filter(email=manager_email).exists():
        manager = User.objects.create_user(
            email=manager_email,
            password="manager123",
            first_name="Manager",
            last_name="User",
            role="manager",
            is_active=True
        )
        print(f"✅ Created manager user: {manager_email} / manager123")
    else:
        print(f"ℹ️ Manager user already exists: {manager_email}")
    
    # Employee user
    employee_email = "employee@test.com"
    if not User.objects.filter(email=employee_email).exists():
        employee = User.objects.create_user(
            email=employee_email,
            password="employee123",
            first_name="Employee",
            last_name="User",
            role="employee",
            is_active=True
        )
        print(f"✅ Created employee user: {employee_email} / employee123")
    else:
        print(f"ℹ️ Employee user already exists: {employee_email}")

if __name__ == "__main__":
    print("🚀 Creating test users...")
    create_test_users()
    print("✅ Done! You can now use these credentials to test authentication:")
    print("   Admin: admin@test.com / admin123")
    print("   Manager: manager@test.com / manager123") 
    print("   Employee: employee@test.com / employee123")