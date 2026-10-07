// Entrées unifiées clavier + boutons tactiles.
// Clavier : flèches, WASD (QWERTY) et ZQSD (AZERTY), Espace pour sauter, X ou E pour taper.

import Phaser from 'phaser';

export interface ControlState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  /** true seulement à l'image où le bouton vient d'être enfoncé. */
  jumpPressed: boolean;
  attackPressed: boolean;
}

export type TouchKey = 'left' | 'right' | 'jump' | 'attack';

type Keys = Record<'LEFT' | 'RIGHT' | 'UP' | 'SPACE' | 'A' | 'Q' | 'D' | 'W' | 'Z' | 'X' | 'E', Phaser.Input.Keyboard.Key>;

export class Controls {
  private keys?: Keys;
  private kb?: Phaser.Input.Keyboard.KeyboardPlugin | null;
  private touch: Record<TouchKey, boolean> = { left: false, right: false, jump: false, attack: false };
  private prevJump = false;
  private prevAttack = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    this.kb = kb;
    if (kb) {
      this.keys = kb.addKeys('LEFT,RIGHT,UP,SPACE,A,Q,D,W,Z,X,E') as Keys;
      kb.addCapture('LEFT,RIGHT,UP,SPACE');
    }
  }

  setTouch(key: TouchKey, down: boolean): void {
    this.touch[key] = down;
  }

  reset(): void {
    this.touch = { left: false, right: false, jump: false, attack: false };
  }

  /**
   * À appeler quand la scène reprend après une pause : pendant la pause, la scène ne reçoit plus
   * les « touche relâchée », donc une touche pourrait rester coincée.
   */
  resetKeys(): void {
    this.reset();
    this.kb?.resetKeys();
    this.prevJump = false;
    this.prevAttack = false;
  }

  read(): ControlState {
    const k = this.keys;
    const down = (...names: (keyof Keys)[]) => !!k && names.some((n) => k[n].isDown);
    const left = down('LEFT', 'A', 'Q') || this.touch.left;
    const right = down('RIGHT', 'D') || this.touch.right;
    const jump = down('UP', 'SPACE', 'W', 'Z') || this.touch.jump;
    const attack = down('X', 'E') || this.touch.attack;
    const state: ControlState = {
      left,
      right,
      jump,
      attack,
      jumpPressed: jump && !this.prevJump,
      attackPressed: attack && !this.prevAttack,
    };
    this.prevJump = jump;
    this.prevAttack = attack;
    return state;
  }
}
