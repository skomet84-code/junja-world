import Phaser from 'phaser';

export type NavPoint = { x:number; y:number };

type NavHooks = {
  onStep?: (x:number,y:number) => void;
  onArrive?: () => void;
};

/**
 * Small client-only navigation controller for v4.
 * It deliberately owns no quest/gameplay rules; legacy data decides the target.
 * Manual drag can cancel it instantly, avoiding competing tweens on mobile Safari.
 */
export class V4NavigationController {
  private scene: Phaser.Scene;
  private actor: Phaser.GameObjects.Container;
  private tween?: Phaser.Tweens.Tween;

  constructor(scene:Phaser.Scene, actor:Phaser.GameObjects.Container) {
    this.scene=scene;
    this.actor=actor;
  }

  get active() { return Boolean(this.tween?.isPlaying()); }

  cancel() {
    this.tween?.stop();
    this.tween=undefined;
  }

  moveTo(target:NavPoint,hooks:NavHooks={}) {
    this.cancel();
    const distance=Phaser.Math.Distance.Between(this.actor.x,this.actor.y,target.x,target.y);
    const duration=Phaser.Math.Clamp(distance*2.35,650,2800);
    this.tween=this.scene.tweens.add({
      targets:this.actor,
      x:target.x,
      y:target.y,
      duration,
      ease:'Sine.easeInOut',
      onUpdate:()=>{
        this.actor.setDepth(this.actor.y+30);
        hooks.onStep?.(Math.round(this.actor.x),Math.round(this.actor.y));
      },
      onComplete:()=>{
        this.tween=undefined;
        hooks.onArrive?.();
      }
    });
  }
}
