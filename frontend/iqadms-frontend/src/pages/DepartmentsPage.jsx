import PlaceholderPage from '../components/PlaceholderPage'

export default function DepartmentsPage() {
  return (
    <PlaceholderPage
      title="Departments"
      subtitle="Organizational records for offices you work with (Registrar, Finance, Library, etc.). Departments are metadata on tasks—not assignees."
      planned={[
        'Contact person, email, and phone',
        'Current requests and projects',
        'Submitted files per department',
        'Link tasks via Related Department field'
      ]}
    />
  )
}
