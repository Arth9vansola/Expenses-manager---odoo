from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class CustomUserManager(BaseUserManager):
    """
    Custom user manager for User model with email as username field
    """
    def create_user(self, email, password=None, **extra_fields):
        """
        Creates and saves a User with the given email and password.
        """
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Creates and saves a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class Company(models.Model):
    """
    Company model representing organizations using the expense management system
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    country = models.CharField(max_length=100)
    default_currency = models.CharField(max_length=3, default='USD')  # ISO 4217 currency codes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    manager = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='direct_reports',
        limit_choices_to={'role__in': ['admin', 'manager']}
    )
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    # Override username field to use email instead
    username = None
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    objects = CustomUserManager()
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def can_approve_expenses(self):
        """Check if user can approve expenses (admin or manager)"""
        return self.role in ['admin', 'manager']
    
    def get_full_name(self):
        return self.name
    
    def get_short_name(self):
        return self.name


class ApprovalRule(models.Model):
    """
    Approval rules define who needs to approve expenses under certain conditions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='approval_rules')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Approval configuration
    approvers = models.JSONField(default=list, help_text="Ordered list of user IDs/roles for approval")
    min_percentage_required = models.IntegerField(
        default=100, 
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Minimum percentage of approvers required"
    )
    specific_approver = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='specific_approval_rules',
        help_text="Specific user required for approval"
    )
    is_hybrid_rule = models.BooleanField(default=False, help_text="Combines multiple approval methods")
    
    # Rule conditions (can be extended)
    min_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    categories = models.JSONField(default=list, blank=True, help_text="Applicable expense categories")
    departments = models.JSONField(default=list, blank=True, help_text="Applicable departments")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0, help_text="Higher numbers = higher priority")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_rules')
    
    class Meta:
        ordering = ['-priority', 'name']
        unique_together = ['company', 'name']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Expense(models.Model):
    """
    Expense model representing expense claims submitted by users
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    
    # Expense details
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    currency = models.CharField(max_length=3, default='USD')
    description = models.TextField()
    date = models.DateField()
    receipt_url = models.URLField(blank=True, null=True)
    receipt_file = models.FileField(upload_to='receipts/', blank=True, null=True)
    category = models.CharField(max_length=100, blank=True)
    
    # Approval workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    approval_chain = models.JSONField(default=list, help_text="Ordered list of user IDs for approval")
    current_approver = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='pending_approvals'
    )
    approval_rule = models.ForeignKey(
        ApprovalRule, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='expenses'
    )
    
    # Metadata
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional fields
    notes = models.TextField(blank=True, help_text="Internal notes")
    reference_number = models.CharField(max_length=100, blank=True, unique=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['current_approver', 'status']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.owner.name} - {self.amount} {self.currency} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Generate reference number if not provided
        if not self.reference_number:
            self.reference_number = f"EXP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)
    
    @property
    def company(self):
        return self.owner.company
    
    def get_next_approver(self):
        """Get the next approver in the approval chain"""
        if not self.approval_chain:
            return None
        
        # Find current position in chain
        try:
            current_index = self.approval_chain.index(str(self.current_approver.id))
            if current_index + 1 < len(self.approval_chain):
                next_approver_id = self.approval_chain[current_index + 1]
                return User.objects.get(id=next_approver_id)
        except (ValueError, User.DoesNotExist):
            pass
        
        return None


class Approval(models.Model):
    """
    Individual approval records for expenses
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_approvals')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    comment = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Additional metadata
    approval_order = models.IntegerField(default=0, help_text="Order in approval chain")
    is_final_approval = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['expense', 'approver']
        ordering = ['approval_order', 'timestamp']
        indexes = [
            models.Index(fields=['expense', 'status']),
            models.Index(fields=['approver', 'status']),
        ]
    
    def __str__(self):
        return f"{self.expense.reference_number} - {self.approver.name} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Update expense status based on approval
        super().save(*args, **kwargs)
        self.update_expense_status()
    
    def update_expense_status(self):
        """Update the parent expense status based on approval results"""
        expense = self.expense
        
        if self.status == 'rejected':
            expense.status = 'rejected'
            expense.current_approver = None
        elif self.status == 'approved':
            # Check if this is the final approval
            if self.is_final_approval or not expense.get_next_approver():
                expense.status = 'approved'
                expense.approved_at = self.timestamp
                expense.current_approver = None
            else:
                # Move to next approver
                expense.current_approver = expense.get_next_approver()
        
        expense.save()
