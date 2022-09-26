import { makeAutoObservable } from "mobx";
import init, { recipesByJobLevel, simulateActions } from "crafty";
import type { Recipe, Action, CraftState, SearchOptions, Player } from "crafty";

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  iterations: 100_000,
  max_steps: 30,
  rng_seed: undefined,
  exploration_constant: undefined,
  max_score_weighting_constant: undefined,
  score_storage_threshold: undefined,
};

class _Simulator {
  loaded = false;

  constructor() {
    makeAutoObservable(this);

    init().then(() => (this.loaded = true));
  }

  private checkLoaded() {
    if (!this.loaded) throw new Error("attempted to use simulator before load");
  }

  recipesByJobLevel(level: number): Recipe[] {
    this.checkLoaded();
    return recipesByJobLevel(level);
  }

  simulateActions(recipe: Recipe, player: Player, actions: Action[]): CraftState {
    this.checkLoaded();
    return simulateActions(recipe, player, DEFAULT_SEARCH_OPTIONS, actions);
  }
}

export const Simulator = new _Simulator();
