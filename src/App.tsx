import { useState } from "react";
import type { Species } from "./api";
import { BreedExplorer } from "./components/BreedExplorer";
import { CityExplorer } from "./components/CityExplorer";
import { UserExplorer } from "./components/UserExplorer";
import { PetExplorer } from "./components/PetExplorer";
import { CatPhotoExplorer } from "./components/CatPhotoExplorer";
import { DogPhotoExplorer } from "./components/DogPhotoExplorer";
import { OtherPhotoExplorer } from "./components/OtherPhotoExplorer";
import "./App.css";

export type AppView = "breeds" | "cities" | "users" | "pets" | "dog-photos" | "cat-photos" | "other-photos";

export function App() {
  const [view, setView] = useState<AppView>("breeds");
  const [species, setSpecies] = useState<Species>("dog");

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">react-ts-pet-db</p>
          <h1>Pet DB Explorer</h1>
        </div>
      </header>

      <nav className="species-tabs main-tabs" role="tablist" aria-label="Main">
        <button
          type="button"
          role="tab"
          aria-selected={view === "breeds"}
          className={view === "breeds" ? "tab active" : "tab"}
          onClick={() => setView("breeds")}
        >
          Breeds
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "cities"}
          className={view === "cities" ? "tab active" : "tab"}
          onClick={() => setView("cities")}
        >
          Cities
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "users"}
          className={view === "users" ? "tab active" : "tab"}
          onClick={() => setView("users")}
        >
          Users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "pets"}
          className={view === "pets" ? "tab active" : "tab"}
          onClick={() => setView("pets")}
        >
          Pets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "dog-photos"}
          className={view === "dog-photos" ? "tab active" : "tab"}
          onClick={() => setView("dog-photos")}
        >
          Dog Photos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "cat-photos"}
          className={view === "cat-photos" ? "tab active" : "tab"}
          onClick={() => setView("cat-photos")}
        >
          Cat Photos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "other-photos"}
          className={view === "other-photos" ? "tab active" : "tab"}
          onClick={() => setView("other-photos")}
        >
          Bird & Bunny Photos
        </button>
      </nav>

      {view === "breeds" ? (
        <BreedExplorer species={species} onSpeciesChange={setSpecies} />
      ) : view === "cities" ? (
        <CityExplorer />
      ) : view === "users" ? (
        <UserExplorer />
      ) : view === "pets" ? (
        <PetExplorer />
      ) : view === "dog-photos" ? (
        <DogPhotoExplorer />
      ) : view === "cat-photos" ? (
        <CatPhotoExplorer />
      ) : (
        <OtherPhotoExplorer />
      )}
    </div>
  );
}
