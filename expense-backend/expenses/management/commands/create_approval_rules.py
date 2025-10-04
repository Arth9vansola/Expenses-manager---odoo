from django.core.management.base import BaseCommand
from expenses.models import Company, ApprovalRule
from decimal import Decimal
import json


class Command(BaseCommand):
    help = 'Create sample approval rules for testing the approval workflow'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--company-name',
            type=str,
            default='TechCorp Solutions',
            help='Name of the company to create approval rules for'
        )
    
    def handle(self, *args, **options):
        company_name = options['company_name']
        
        try:
            company = Company.objects.get(name=company_name)
        except Company.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Company "{company_name}" not found')
            )
            return
        
        # Clear existing rules for clean setup
        existing_rules = ApprovalRule.objects.filter(company=company)
        if existing_rules.exists():
            self.stdout.write(f'Deleting {existing_rules.count()} existing approval rules...')
            existing_rules.delete()
        
        # Rule 1: Low-value expenses (under $100) - Any manager approval
        rule1 = ApprovalRule.objects.create(
            company=company,
            name="Low Value Expenses",
            description="Any manager can approve expenses under $100",
            min_amount=Decimal('0.01'),
            max_amount=Decimal('99.99'),
            approvers=[{"role": "manager"}],
            min_percentage_required=100,
            categories=["Meals", "Office Supplies", "Transportation"],
            is_active=True,
            priority=1
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Created rule: {rule1.name} ($0.01 - $99.99)')
        )
        
        # Rule 2: Medium-value expenses ($100-$500) - Sequential approval
        rule2 = ApprovalRule.objects.create(
            company=company,
            name="Medium Value Expenses",
            description="Manager first, then admin for medium value expenses",
            min_amount=Decimal('100.00'),
            max_amount=Decimal('500.00'),
            approvers=[{"role": "manager"}, {"role": "admin"}],
            min_percentage_required=100,
            categories=["Meals", "Office Supplies", "Transportation", "Travel"],
            is_active=True,
            priority=2
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Created rule: {rule2.name} ($100 - $500)')
        )
        
        # Rule 3: High-value expenses ($500-$2000) - Percentage approval
        rule3 = ApprovalRule.objects.create(
            company=company,
            name="High Value Expenses",
            description="60% of managers must approve high-value expenses",
            min_amount=Decimal('500.01'),
            max_amount=Decimal('2000.00'),
            approvers=[{"role": "manager"}, {"role": "admin"}],
            min_percentage_required=60,
            categories=["Travel", "Technology", "Entertainment"],
            is_active=True,
            priority=3
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Created rule: {rule3.name} ($500 - $2000)')
        )
        
        # Rule 4: Very high-value expenses (over $2000) - Special approver + admin
        rule4 = ApprovalRule.objects.create(
            company=company,
            name="Very High Value Expenses",
            description="Admin can auto-approve, or requires multiple manager approvals", 
            min_amount=Decimal('2000.01'),
            max_amount=None,
            approvers=[{"role": "manager"}, {"role": "manager"}, {"role": "admin"}],
            min_percentage_required=100,
            categories=["Travel", "Technology", "Other"],
            is_active=True,
            priority=4
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Created rule: {rule4.name} (>$2000)')
        )
        
        # Rule 5: Healthcare expenses - All managers must approve
        rule5 = ApprovalRule.objects.create(
            company=company,
            name="Healthcare Expenses",
            description="All managers must approve healthcare expenses",
            min_amount=Decimal('0.01'),
            max_amount=None,
            approvers=[{"role": "manager"}],
            min_percentage_required=100,
            categories=["Healthcare"],
            is_active=True,
            priority=5
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Created rule: {rule5.name} (Healthcare)')
        )
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(
            self.style.SUCCESS(f'🎉 Created 5 approval rules for {company.name}')
        )
        self.stdout.write('='*50)
        
        # Display summary
        self.stdout.write('\n📋 Approval Rules Summary:')
        rules = ApprovalRule.objects.filter(company=company).order_by('min_amount')
        
        for rule in rules:
            min_amt = f"${rule.min_amount}" if rule.min_amount else "$0"
            max_amt = f"${rule.max_amount}" if rule.max_amount else "∞"
            approvers_count = len(rule.approvers) if rule.approvers else 0
            categories = ', '.join(rule.categories) if rule.categories else 'All'
            
            self.stdout.write(f"\n📌 {rule.name}")
            self.stdout.write(f"   • Range: {min_amt} - {max_amt}")
            self.stdout.write(f"   • Approvers: {approvers_count} ({rule.min_percentage_required}% required)")
            self.stdout.write(f"   • Categories: {categories}")
            self.stdout.write(f"   • Priority: {rule.priority}")
        
        self.stdout.write(f'\n🚀 Ready to test approval workflows!')
        self.stdout.write('Run: python test_approval_api.py')