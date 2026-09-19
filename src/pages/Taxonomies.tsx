import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { getTaxonomies, api } from "../lib/api";
import type { TaxonomyItem } from "../lib/api";

function TaxonomyCard({
  title,
  type,
  items,
  onAdd,
}: {
  title: string;
  type: string;
  items: TaxonomyItem[];
  onAdd: () => void;
}) {
  const handleAdd = async () => {
    const name = window.prompt(`Enter new ${title} name:`);
    if (!name) return;
    try {
      await api.post(`/taxonomies/${type}`, { name });
      onAdd();
    } catch (err) {
      console.error(err);
      alert("Failed to add");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <button
          onClick={handleAdd}
          className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
        >
          Add
        </button>
      </div>
      <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-500 text-center">Empty</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="px-4 py-3 text-sm text-gray-700 flex justify-between hover:bg-gray-50"
            >
              {item.name}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function Taxonomies() {
  const [data, setData] = useState<{
    categories: TaxonomyItem[];
    cities: TaxonomyItem[];
    associations: TaxonomyItem[];
    delivery_modes: TaxonomyItem[];
  } | null>(null);

  const [search, setSearch] = useState("");

  const filterItems = (items: TaxonomyItem[]) => {
    if (!search.trim()) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    );
  };

  const fetchTaxonomies = () => {
    getTaxonomies().then(setData).catch(console.error);
  };

  useEffect(() => {
    fetchTaxonomies();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          Taxonomies Management
        </h3>
        <div className="relative min-w-[250px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search taxonomies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {!data ? (
        <div className="text-center py-10 text-gray-500">
          Loading taxonomies...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TaxonomyCard
            title="Categories"
            type="categories"
            items={filterItems(data.categories)}
            onAdd={fetchTaxonomies}
          />
          <TaxonomyCard
            title="Cities"
            type="cities"
            items={filterItems(data.cities)}
            onAdd={fetchTaxonomies}
          />
          <TaxonomyCard
            title="Associations"
            type="associations"
            items={filterItems(data.associations)}
            onAdd={fetchTaxonomies}
          />
          <TaxonomyCard
            title="Delivery Modes"
            type="delivery_modes"
            items={filterItems(data.delivery_modes)}
            onAdd={fetchTaxonomies}
          />
        </div>
      )}
    </div>
  );
}
