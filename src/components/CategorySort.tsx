"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  slug: string;
  sortera: string;
};

export default function CategorySort({ slug, sortera }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("sortera", e.target.value);
    } else {
      params.delete("sortera");
    }
    params.delete("sida");
    router.push(`/kategori/${slug}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={sortera}
      onChange={handleChange}
      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 bg-white"
    >
      <option value="">Sortera: Standard</option>
      <option value="pris-asc">Pris: Lägst först</option>
      <option value="pris-desc">Pris: Högst först</option>
      <option value="nyast">Nyast</option>
    </select>
  );
}
