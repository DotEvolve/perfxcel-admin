import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { getCourses, getTaxonomies, api } from './api';
import type { Course, TaxonomyItem } from './api';
import CourseForm from './components/CourseForm';

export default function App() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <img src="/logo.png" alt="PerfXcel Logo" className="h-8 w-8 mr-3 object-contain" />
          <h1 className="text-xl font-semibold tracking-tight text-indigo-600">Perfxcel Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Dashboard
          </Link>
          <Link to="/courses" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Courses
          </Link>
          <Link to="/taxonomies" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Taxonomies
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
          <h2 className="text-lg font-medium">Administration</h2>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<CoursesList />} />
            <Route path="/courses/new" element={<CourseForm />} />
            <Route path="/courses/:id/edit" element={<CourseForm />} />
            <Route path="/taxonomies" element={<Taxonomies />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}


function Dashboard() {
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Dashboard</h3>
      <p className="text-gray-600">Welcome to the Perfxcel LMS Admin Portal.</p>
    </div>
  );
}

function CoursesList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-semibold">Courses</h3>
        <button onClick={() => navigate('/courses/new')} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
          Add Course
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading courses...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {courses.length === 0 ? (
              <li className="p-6 text-center text-gray-500">No courses found.</li>
            ) : (
              courses.map(course => (
                <li key={course.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{course.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {course.categories?.name} • {course.cities?.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${course.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                    <button onClick={() => navigate(`/courses/${course.id}/edit`)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                      Edit
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Taxonomies() {
  const [data, setData] = useState<{ categories: TaxonomyItem[], cities: TaxonomyItem[], associations: TaxonomyItem[] } | null>(null);

  const fetchTaxonomies = () => {
    getTaxonomies()
      .then(setData)
      .catch(console.error);
  };

  useEffect(() => {
    fetchTaxonomies();
  }, []);

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6">Taxonomies Management</h3>
      
      {!data ? (
        <div className="text-center py-10 text-gray-500">Loading taxonomies...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TaxonomyCard title="Categories" type="categories" items={data.categories} onAdd={fetchTaxonomies} />
          <TaxonomyCard title="Cities" type="cities" items={data.cities} onAdd={fetchTaxonomies} />
          <TaxonomyCard title="Associations" type="associations" items={data.associations} onAdd={fetchTaxonomies} />
        </div>
      )}
    </div>
  );
}

function TaxonomyCard({ title, type, items, onAdd }: { title: string, type: string, items: TaxonomyItem[], onAdd: () => void }) {
  const handleAdd = async () => {
    const name = window.prompt(`Enter new ${title} name:`);
    if (!name) return;
    try {
      await api.post(`/taxonomies/${type}`, { name });
      onAdd();
    } catch (err) {
      console.error(err);
      alert('Failed to add');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <button onClick={handleAdd} className="text-sm text-indigo-600 font-medium hover:text-indigo-800">Add</button>
      </div>
      <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-500 text-center">Empty</li>
        ) : (
          items.map(item => (
            <li key={item.id} className="px-4 py-3 text-sm text-gray-700 flex justify-between hover:bg-gray-50">
              {item.name}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
