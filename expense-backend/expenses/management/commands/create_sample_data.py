"""
Management command to create sample data for expense management system
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from expenses.models import Company, User, ApprovalRule, Expense, Approval
from decimal import Decimal
import uuid
from datetime import date, datetime


class Command(BaseCommand):
    help = 'Create sample data for expense management system'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data for expense management system...')
        
        # Create sample company
        company = Company.objects.create(
            name="TechCorp Solutions",
            country="United States",
            default_currency="USD"
        )
        self.stdout.write(f'✓ Created company: {company.name}')
        
        # Create users
        admin_user = User.objects.create(
            name="Admin User",
            email="admin@techcorp.com",
            role="admin",
            company=company,
            password=make_password("admin123"),
            is_staff=True,
            is_superuser=True
        )
        
        manager1 = User.objects.create(
            name="John Manager",
            email="john.manager@techcorp.com",
            role="manager",
            company=company,
            password=make_password("manager123")
        )
        
        manager2 = User.objects.create(
            name="Sarah Director",
            email="sarah.director@techcorp.com",
            role="manager",
            company=company,
            manager=admin_user,
            password=make_password("manager123")
        )
        
        employee1 = User.objects.create(
            name="Alice Employee",
            email="alice@techcorp.com",
            role="employee",
            company=company,
            manager=manager1,
            password=make_password("employee123")
        )
        
        employee2 = User.objects.create(
            name="Bob Developer",
            email="bob@techcorp.com",
            role="employee",
            company=company,
            manager=manager1,
            password=make_password("employee123")
        )
        
        self.stdout.write('✓ Created users: Admin, 2 Managers, 2 Employees')
        
        # Create approval rules
        rule1 = ApprovalRule.objects.create(
            company=company,
            name="Small Expenses",
            description="Expenses under $500 require manager approval",
            approvers=[str(manager1.id)],
            min_percentage_required=100,
            max_amount=Decimal('500.00'),
            created_by=admin_user,
            priority=1
        )
        
        rule2 = ApprovalRule.objects.create(
            company=company,
            name="Large Expenses",
            description="Expenses over $500 require manager and director approval",
            approvers=[str(manager1.id), str(manager2.id)],
            min_percentage_required=100,
            min_amount=Decimal('500.01'),
            created_by=admin_user,
            priority=2
        )
        
        rule3 = ApprovalRule.objects.create(
            company=company,
            name="Travel Expenses",
            description="All travel expenses require special approval",
            approvers=[str(admin_user.id)],
            categories=["Travel", "Transportation"],
            min_percentage_required=100,
            created_by=admin_user,
            priority=3
        )
        
        self.stdout.write('✓ Created approval rules: Small, Large, and Travel expenses')
        
        # Create sample expenses
        expense1 = Expense.objects.create(
            owner=employee1,
            amount=Decimal('75.50'),
            currency="USD",
            description="Office supplies for project",
            date=date.today(),
            category="Office Supplies",
            status="pending",
            approval_chain=[str(manager1.id)],
            current_approver=manager1,
            approval_rule=rule1
        )
        
        expense2 = Expense.objects.create(
            owner=employee2,
            amount=Decimal('1250.00'),
            currency="USD",
            description="New laptop for development work",
            date=date.today(),
            category="Equipment",
            status="pending",
            approval_chain=[str(manager1.id), str(manager2.id)],
            current_approver=manager1,
            approval_rule=rule2
        )
        
        expense3 = Expense.objects.create(
            owner=employee1,
            amount=Decimal('450.00'),
            currency="USD",
            description="Flight tickets for client meeting",
            date=date.today(),
            category="Travel",
            status="pending",
            approval_chain=[str(admin_user.id)],
            current_approver=admin_user,
            approval_rule=rule3
        )
        
        # Create an approved expense
        expense4 = Expense.objects.create(
            owner=employee2,
            amount=Decimal('25.99'),
            currency="USD",
            description="Team lunch",
            date=date.today(),
            category="Meals",
            status="approved",
            approval_rule=rule1,
            approved_at=datetime.now()
        )
        
        self.stdout.write('✓ Created sample expenses: 3 pending, 1 approved')
        
        # Create approval records
        approval1 = Approval.objects.create(
            expense=expense4,
            approver=manager1,
            status="approved",
            comment="Approved for team building",
            approval_order=1,
            is_final_approval=True
        )
        
        self.stdout.write('✓ Created approval records')
        
        self.stdout.write(
            self.style.SUCCESS('\n🎉 Sample data created successfully!\n')
        )
        
        # Display login credentials
        self.stdout.write('Login Credentials:')
        self.stdout.write('------------------')
        self.stdout.write('Admin: admin@techcorp.com / admin123')
        self.stdout.write('Manager: john.manager@techcorp.com / manager123')
        self.stdout.write('Employee: alice@techcorp.com / employee123')
        self.stdout.write('Employee: bob@techcorp.com / employee123')
        self.stdout.write('\nRun: python manage.py runserver')
        self.stdout.write('Then visit: http://127.0.0.1:8000/admin/')