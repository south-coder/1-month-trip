import { useState } from "react";
import { phrases } from "./phrasebook";
export function usePhrases(favorites: string[]) {
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const filtered = phrases.filter(
    (p) =>
      (category === "전체" || p.category === category) &&
      (!onlyFavorites || favorites.includes(p.id)) &&
      `${p.ko} ${p.ja}`.toLocaleLowerCase().includes(query),
  );
  return {
    category,
    setCategory,
    search,
    setSearch,
    onlyFavorites,
    setOnlyFavorites,
    filtered,
  };
}
