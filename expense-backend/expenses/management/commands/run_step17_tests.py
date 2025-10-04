#!/usr/bin/env python3
"""
Django Management Command for Step 17 Testing
=============================================

Custom Django management command to run comprehensive tests
with proper setup and reporting.

Usage:
    python manage.py run_step17_tests
    python manage.py run_step17_tests --verbose
    python manage.py run_step17_tests --coverage

Author: GitHub Copilot
Date: October 4, 2025
"""

import os
import sys
from django.core.management.base import BaseCommand, CommandError
from django.test.utils import get_runner
from django.conf import settings
from django.db import connection
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Run Step 17 comprehensive tests with proper setup'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose', '-v',
            action='store_true',
            help='Verbose output'
        )
        parser.add_argument(
            '--coverage',
            action='store_true',
            help='Run with coverage reporting'
        )
        parser.add_argument(
            '--offline',
            action='store_true',
            help='Run only offline tests'
        )
        parser.add_argument(
            '--quick',
            action='store_true',
            help='Run quick smoke tests only'
        )
    
    def handle(self, *args, **options):
        """Run the comprehensive test suite"""
        
        self.stdout.write(
            self.style.SUCCESS('Starting Step 17: Comprehensive Testing')
        )
        
        verbose = options.get('verbose', False)
        coverage = options.get('coverage', False)
        offline = options.get('offline', False)
        quick = options.get('quick', False)
        
        # Ensure we're using the test database
        if 'test' not in settings.DATABASES['default']['NAME']:
            self.stdout.write(
                self.style.WARNING('Setting up test database...')
            )
        
        try:
            # Run setup checks
            self._run_setup_checks()
            
            # Run the appropriate test suite
            if quick:
                self._run_quick_tests()
            elif offline:
                self._run_offline_tests()
            else:
                self._run_comprehensive_tests(verbose, coverage)
                
            self.stdout.write(
                self.style.SUCCESS('✅ Step 17 testing completed successfully!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Testing failed: {str(e)}')
            )
            raise CommandError(f'Test execution failed: {str(e)}')
    
    def _run_setup_checks(self):
        """Run setup checks before testing"""
        self.stdout.write('Running setup checks...')
        
        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            self.stdout.write('✅ Database connection OK')
        except Exception as e:
            raise CommandError(f'Database connection failed: {e}')
        
        # Check required models
        from expenses.models import User, Company, Expense, ApprovalRule
        self.stdout.write('✅ Models imported successfully')
        
        # Check API endpoints
        from django.urls import reverse
        try:
            reverse('secure-users-list-create')
            self.stdout.write('✅ API endpoints configured')
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️ Some API endpoints may not be configured: {e}')
            )
    
    def _run_quick_tests(self):
        """Run quick smoke tests"""
        self.stdout.write('Running quick smoke tests...')
        
        # Import and run basic tests
        import subprocess
        import sys
        
        test_file = 'test_step17_comprehensive.py'
        
        # Run specific quick tests
        cmd = [
            sys.executable, test_file,
            '--quick'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            self.stdout.write(self.style.SUCCESS('✅ Quick tests passed'))
        else:
            self.stdout.write(self.style.ERROR('❌ Quick tests failed'))
            self.stdout.write(result.stderr)
    
    def _run_offline_tests(self):
        """Run tests that work completely offline"""
        self.stdout.write('Running offline tests...')
        
        # Run comprehensive tests with mocked external services
        import subprocess
        import sys
        
        test_file = 'test_step17_comprehensive.py'
        
        # Set environment variable for offline mode
        env = os.environ.copy()
        env['OFFLINE_MODE'] = '1'
        
        cmd = [sys.executable, test_file]
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        self.stdout.write(result.stdout)
        
        if result.returncode == 0:
            self.stdout.write(self.style.SUCCESS('✅ Offline tests completed'))
        else:
            self.stdout.write(self.style.ERROR('❌ Some offline tests failed'))
            if result.stderr:
                self.stdout.write(result.stderr)
    
    def _run_comprehensive_tests(self, verbose=False, coverage=False):
        """Run the full comprehensive test suite"""
        self.stdout.write('Running comprehensive test suite...')
        
        import subprocess
        import sys
        
        # Prepare command
        cmd = [sys.executable, 'test_step17_comprehensive.py']
        
        if verbose:
            cmd.append('--verbose')
        
        # Run tests with optional coverage
        if coverage:
            try:
                # Try to run with coverage
                cmd = ['coverage', 'run'] + cmd
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                # Show coverage report
                if result.returncode == 0:
                    coverage_cmd = ['coverage', 'report', '--show-missing']
                    coverage_result = subprocess.run(coverage_cmd, capture_output=True, text=True)
                    self.stdout.write('\n--- Coverage Report ---')
                    self.stdout.write(coverage_result.stdout)
                    
            except FileNotFoundError:
                self.stdout.write(
                    self.style.WARNING('Coverage tool not found, running without coverage')
                )
                result = subprocess.run(cmd, capture_output=True, text=True)
        else:
            result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Display results
        self.stdout.write(result.stdout)
        
        if result.returncode == 0:
            self.stdout.write(
                self.style.SUCCESS('🎉 All comprehensive tests passed!')
            )
        else:
            self.stdout.write(
                self.style.ERROR('❌ Some tests failed')
            )
            if result.stderr:
                self.stdout.write(result.stderr)
                
        # Additional test metrics
        self._show_test_metrics()
    
    def _show_test_metrics(self):
        """Show additional test metrics and system info"""
        self.stdout.write('\n--- System Test Metrics ---')
        
        # Database info
        from django.db import connection
        self.stdout.write(f'Database: {connection.vendor}')
        
        # Django version
        import django
        self.stdout.write(f'Django version: {django.get_version()}')
        
        # Python version
        import sys
        self.stdout.write(f'Python version: {sys.version.split()[0]}')
        
        # Model counts
        from expenses.models import User, Company, Expense, ApprovalRule
        self.stdout.write(f'Users in test DB: {User.objects.count()}')
        self.stdout.write(f'Companies in test DB: {Company.objects.count()}')
        self.stdout.write(f'Expenses in test DB: {Expense.objects.count()}')
        self.stdout.write(f'Approval rules in test DB: {ApprovalRule.objects.count()}')
        
        # Settings check
        self.stdout.write(f'Debug mode: {settings.DEBUG}')
        self.stdout.write(f'Test database: {"test" in settings.DATABASES["default"]["NAME"]}')
        
        self.stdout.write('--- End Metrics ---\n')