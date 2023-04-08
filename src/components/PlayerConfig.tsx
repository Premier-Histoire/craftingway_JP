import "./PlayerConfig.scss";

import { action } from "mobx";
import { observer } from "mobx-react-lite";
import React, { useState } from "react";

import Select from "./Select";
import Emoji from "./Emoji";
import { Job, JOBS, JOB_EMOJIS } from "../lib/jobs";
import { PlayerState } from "../lib/player-state";
import { RecipeState } from "../lib/recipe-state";
import { Consumable, MEALS, POTIONS } from "../lib/consumables";
import clsx from "clsx";

type StatConfig = {
  name: string;
  label: string;
  min: number;
  max: number;
};

const STATS = [
  { name: "job_level", label: "Level", min: 1, max: 90 },
  { name: "craftsmanship", label: "Craftsmanship", min: 0, max: 4000 },
  { name: "control", label: "Control", min: 0, max: 4000 },
  { name: "cp", label: "CP", min: 180, max: 800 },
] as const satisfies readonly StatConfig[];

const PlayerConfig = observer(function PlayerConfig() {
  type CopyMenuState = "inactive" | "copying" | "copying-all";
  const [copyMenuState, setCopyMenuState] = useState<CopyMenuState>("inactive");

  const handleJobChange = action((event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: add warning dialog before clearing recipe
    PlayerState.job = event.target.value as Job;
    RecipeState.recipe = null;
    setCopyMenuState("inactive");
  });

  const handleStatsCopy = action((job: Job) => {
    const stats = PlayerState.statsByJob[job];
    PlayerState.setStats(stats);
    setCopyMenuState("inactive");
  });

  const handleStatsCopyAll = action(() => {
    const stats = PlayerState.stats;
    PlayerState.setStatsForAllJobs(stats);
    setCopyMenuState("inactive");
  });

  return (
    <section className="PlayerConfig">
      <fieldset className="jobs">
        {JOBS.map((job) => {
          const id = `radio-${job}`;

          return (
            <React.Fragment key={job}>
              <input
                id={id}
                className="visually-hidden"
                type="radio"
                name="job"
                checked={PlayerState.job === job}
                value={job}
                onChange={handleJobChange}
                autoComplete="off"
              />
              <label htmlFor={id} tabIndex={-1}>
                <Emoji emoji={JOB_EMOJIS[job]} />
                {job}
              </label>
            </React.Fragment>
          );
        })}
      </fieldset>

      <div className="configs">
        <div className="stats">
          {STATS.map(({ name, label, min, max }) => {
            const id = `input-${name}`;

            return (
              <div className="field" key={name}>
                <label htmlFor={id}>{label}</label>
                <input
                  id={id}
                  key={name}
                  type="number"
                  min={min}
                  max={max}
                  value={PlayerState.stats[name].toString()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    PlayerState.setStats({ [name]: value });
                  }}
                />
                {name !== "job_level" && (
                  <div className="bonuses">
                    {PlayerState.foodBonus[name] > 0 && (
                      <span className="food">+{PlayerState.foodBonus[name]}</span>
                    )}
                    {PlayerState.potionBonus[name] > 0 && (
                      <span className="potion">+{PlayerState.potionBonus[name]}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="consumables">
          <Select<Consumable>
            className={clsx("food", { active: !!PlayerState.food })}
            label="Food"
            placeholder="No food"
            items={MEALS.slice()}
            itemToString={(food) => food?.name || ""}
            onChange={action((selectedItem) => (PlayerState.food = selectedItem))}
          >
            {(food) => <span>{food.name}</span>}
          </Select>

          <Select<Consumable>
            className={clsx("potion", { active: !!PlayerState.potion })}
            label="Potion"
            placeholder="No potion"
            items={POTIONS.slice()}
            itemToString={(potion) => potion?.name || ""}
            onChange={action((selectedItem) => (PlayerState.potion = selectedItem))}
          >
            {(potion) => <span>{potion.name}</span>}
          </Select>
        </div>
      </div>

      <div className="prompts">
        {copyMenuState !== "copying-all" ? (
          <button className="link" onClick={() => setCopyMenuState("copying-all")}>
            Copy stats <strong>to</strong> all other jobs
          </button>
        ) : (
          <div>
            Copying {PlayerState.job} stats to all other jobs… Are you sure?{" "}
            <button className="link" onClick={handleStatsCopyAll}>
              OK
            </button>{" "}
            <button className="link" onClick={() => setCopyMenuState("inactive")}>
              Cancel
            </button>
          </div>
        )}

        {copyMenuState !== "copying" ? (
          <button className="link" onClick={() => setCopyMenuState("copying")}>
            Copy stats <strong>from</strong> another job
          </button>
        ) : (
          <div>
            Copy stats from…
            {JOBS.map((job) => (
              <React.Fragment key={job}>
                {" "}
                <button key={job} className="link" onClick={() => handleStatsCopy(job)}>
                  {job}
                </button>
              </React.Fragment>
            ))}{" "}
            <button className="link" onClick={() => setCopyMenuState("inactive")}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

export default PlayerConfig;
