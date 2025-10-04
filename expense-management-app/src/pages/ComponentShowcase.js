import React, { useState } from 'react';
import {
  Button,
  Modal,
  ConfirmModal,
  InfoModal,
  FormModal,
  Table,
  Pagination,
  Loader,
  SkeletonLoader,
  Form,
  FormField,
  FormSection,
  FormActions,
  Alert,
  ToastProvider,
  useToast,
  useFormValidation,
  validationSchemas
} from '../components';

/**
 * Component Showcase/Test Page
 * Demonstrates all reusable components with validation
 */
const ComponentShowcase = () => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableData] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'employee' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'manager' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'admin' }
  ]);

  const toast = useToast();

  const tableColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="small" variant="primary">Edit</Button>
          <Button size="small" variant="danger">Delete</Button>
        </div>
      )
    }
  ];

  const {
    resetForm
  } = useFormValidation(validationSchemas.expense);

  const handleFormSubmit = (formValues) => {
    console.log('Form submitted:', formValues);
    toast.success('Expense submitted successfully!');
    resetForm();
  };

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Loading completed!');
    }, 3000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Component Showcase</h1>

      {/* Alerts */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Alerts</h2>
        <Alert
          type="success"
          title="Success!"
          message="This is a success alert message."
          closable
          onClose={() => console.log('Alert closed')}
        />
        <Alert
          type="error"
          message="This is an error alert without title."
        />
        <Alert
          type="warning"
          title="Warning"
          message="This is a warning alert with actions."
          actions={[
            { label: 'Action 1', onClick: () => toast.info('Action 1 clicked') },
            { label: 'Action 2', onClick: () => toast.info('Action 2 clicked') }
          ]}
        />
      </section>

      {/* Buttons */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="primary" outline>Primary Outline</Button>
          <Button variant="secondary" size="small">Small Button</Button>
          <Button variant="primary" size="large">Large Button</Button>
          <Button variant="primary" loading>Loading...</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Open Modal
          </Button>
          <Button variant="danger" onClick={() => setShowConfirm(true)}>
            Show Confirm
          </Button>
          <Button variant="info" onClick={() => setShowInfo(true)}>
            Show Info
          </Button>
          <Button variant="primary" onClick={() => setShowFormModal(true)}>
            Form Modal
          </Button>
          <Button variant="secondary" onClick={simulateLoading}>
            Test Loading
          </Button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <Button variant="primary" onClick={() => toast.success('Success toast!')}>
            Success Toast
          </Button>
          <Button variant="danger" onClick={() => toast.error('Error toast!')}>
            Error Toast
          </Button>
          <Button variant="warning" onClick={() => toast.warning('Warning toast!')}>
            Warning Toast
          </Button>
          <Button variant="info" onClick={() => toast.info('Info toast!')}>
            Info Toast
          </Button>
        </div>
      </section>

      {/* Loaders */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Loaders</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
          <Loader size="small" text="Small loader" />
          <Loader size="medium" text="Medium loader" />
          <Loader size="large" text="Large loader" />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Skeleton Loaders</h3>
          <SkeletonLoader count={3} />
          <SkeletonLoader type="button" width="120px" />
        </div>

        {loading && (
          <Loader overlay text="Loading data..." />
        )}
      </section>

      {/* Table */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Table</h2>
        <Table
          data={tableData}
          columns={tableColumns}
          selectable
          onRowClick={(row) => console.log('Row clicked:', row)}
          pagination={
            <Pagination
              current={1}
              pageSize={10}
              total={100}
              onChange={(page, size) => console.log('Page changed:', page, size)}
            />
          }
        />
      </section>

      {/* Form Preview - Static Display */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Form with Validation (Preview)</h2>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p>Form validation system ready for integration with existing forms.</p>
          <Button onClick={() => toast.info('Form validation system active!')}>Test Validation</Button>
        </div>
      </section>

      {/* Modals */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Example Modal"
        size="medium"
      >
        <p>This is a basic modal with custom content.</p>
        <p>It supports keyboard navigation and focus management.</p>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          toast.success('Action confirmed!');
          setShowConfirm(false);
        }}
        title="Confirm Action"
        message="Are you sure you want to proceed with this action?"
        confirmText="Yes, proceed"
        cancelText="Cancel"
      />

      <InfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="Information"
        message="This is an informational message to the user."
      />

      <FormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={(e) => {
          e.preventDefault();
          toast.success('Form submitted!');
          setShowFormModal(false);
        }}
        title="Quick Form"
        submitText="Save"
      >
        <FormField
          label="Name"
          name="name"
          placeholder="Enter name"
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="Enter email"
        />
      </FormModal>
    </div>
  );
};

// Wrapper with ToastProvider
const ComponentShowcaseWithToast = () => (
  <ToastProvider position="top-right">
    <ComponentShowcase />
  </ToastProvider>
);

export default ComponentShowcaseWithToast;