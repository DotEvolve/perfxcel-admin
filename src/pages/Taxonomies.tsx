import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { getTaxonomies } from "../lib/api";
import type { TaxonomyItem } from "../lib/api";

import { Pencil, Trash2, Plus } from "lucide-react";
import InlineEditModal from "../components/InlineEditModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { createTaxonomy, updateTaxonomy, deleteTaxonomy } from "../lib/api";

function TaxonomyCard({
  title,
  type,
  items,
  onRefresh,
}: {
  title: string;
  type: string;
  items: TaxonomyItem[];
  onRefresh: () => void;
}) {
  const [newItemName, setNewItemName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editItem, setEditItem] = useState<TaxonomyItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState<TaxonomyItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await createTaxonomy(type, newItemName.trim());
      setNewItemName("");
      onRefresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAddError(axiosErr.response?.data?.message ?? "Failed to add item");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (newName: string) => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      await updateTaxonomy(type, editItem.id, newName);
      setEditItem(null);
      onRefresh();
    } catch (err: unknown) {
      // Keep modal open; user can retry — error surfaced by the modal's disabled state
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteTaxonomy(type, deleteItem.id);
      setDeleteItem(null);
      onRefresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setDeleteError(axiosErr.response?.data?.message ?? "Failed to delete item");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      
      <ul className="divide-y divide-gray-200 flex-1 overflow-y-auto min-h-[200px] max-h-96">
        {items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-500 text-center">Empty</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="px-4 py-3 text-sm text-gray-700 flex justify-between items-center hover:bg-gray-50 group"
            >
              <span>{item.name}</span>
              <div className="hidden group-hover:flex space-x-2">
                <button
                  onClick={() => setEditItem(item)}
                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteItem(item)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
      
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={`New ${title.slice(0, -1).toLowerCase()}...`}
            className="flex-1 min-w-0 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 px-3 py-1.5 border"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={!newItemName.trim() || adding}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
        {addError && (
          <p className="mt-1.5 text-xs text-red-600">{addError}</p>
        )}
      </div>

      <InlineEditModal
        isOpen={!!editItem}
        title={`Edit ${title.slice(0, -1)}`}
        initialValue={editItem?.name || ""}
        onSave={handleEdit}
        onCancel={() => setEditItem(null)}
      />

      <ConfirmationModal
        isOpen={!!deleteItem}
        title={`Delete ${title.slice(0, -1)}`}
        message={
          <>
            Are you sure you want to delete <strong>{deleteItem?.name}</strong>?
            {deleteError && (
              <span className="block mt-2 text-red-600 text-xs">{deleteError}</span>
            )}
          </>
        }
        confirmText={deleteLoading ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteItem(null); setDeleteError(null); }}
        isDestructive={true}
      />
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
            onRefresh={fetchTaxonomies}
          />
          <TaxonomyCard
            title="Cities"
            type="cities"
            items={filterItems(data.cities)}
            onRefresh={fetchTaxonomies}
          />
          <TaxonomyCard
            title="Associations"
            type="associations"
            items={filterItems(data.associations)}
            onRefresh={fetchTaxonomies}
          />
          <TaxonomyCard
            title="Delivery Modes"
            type="delivery_modes"
            items={filterItems(data.delivery_modes)}
            onRefresh={fetchTaxonomies}
          />
        </div>
      )}
    </div>
  );
}
