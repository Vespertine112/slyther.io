import { Vector, Position } from '$lib/shared/gameTypes';
import { Random } from '$lib/shared/random';
import { Entity } from '../entites/entity';
import type { Renderer } from '../renderer';

/**
 * A generic *point* particle system
 */
export class ParticleSystem {
	private particles: Entity[] = [];
	private canvas: HTMLCanvasElement;
	private momentumGenCallback: () => Vector = () =>
		new Vector(Random.nextGaussian(1 / 10000, 1 / 1000), Random.nextGaussian(1 / 10000, 1 / 1000));
	private offAfterFlag: boolean = false;
	private numOfParticles: number = 0;
	private dpiScaledParticleSize: number;

	position: Position; // NOTE: Represents the position of the system. This will dyamically change! Most likely the 'live' position of another entity!
	direction: number = 0; // Direction of system in radians
	generateParticles: boolean = false;
	offAfterTimer: number = 0;
	systemLifeTime = 0;

	constructor(
		canvas: HTMLCanvasElement,
		position: Position,
		public renderer: Renderer,
		generateParticles?: boolean,
		momentumGenCallback?: () => Vector
	) {
		this.canvas = canvas;
		this.position = position;
		this.generateParticles = generateParticles ?? false;
		this.momentumGenCallback = momentumGenCallback ?? this.momentumGenCallback;
		this.dpiScaledParticleSize = Math.sqrt(this.canvas.width * this.canvas.height) * 0.0085;
	}

	/*
	 * Creates 'n' particles
	 */
	createAndAddParticles(n: number) {
		let size = Math.abs(Random.nextGaussian(this.dpiScaledParticleSize, 1.3));
		this.numOfParticles += n;

		for (let index = 0; index < n; index++) {
			let entity = new Entity(
				'std',
				{
					render: false,
					position: this.position,
					width: size,
					height: size,
					lifeLength: Random.nextGaussian(4, 1.2) * 500,
					moveRatePerMs: 1 / (10000 * Random.nextGaussian()),
					momentum: this.momentumGenCallback(),
					color: Random.getRandomFireColor()
				},
				{}
			);

			this.particles.push(entity);
		}
	}

	/**
	 * Update the state of all particles.  This includes removing any that have exceeded their lifetime.
	 */
	update(elapsedTime: number, numParticles?: number) {
		this.particles = this.particles.filter((particle) => {
			particle.timeAlive += elapsedTime;

			particle.position = particle.position.fromVector(particle.momentum);

			let particleDead = particle.timeAlive > particle.lifeLength;
			if (particleDead) {
				this.numOfParticles -= 1;
			}

			return particle.timeAlive < particle.lifeLength;
		});

		if (this.offAfterTimer > 0) {
			this.offAfterTimer -= elapsedTime;
		} else if (this.offAfterFlag) {
			this.generateParticles = false;
		}

		if (this.generateParticles) {
			this.createAndAddParticles(numParticles ?? 1);
		}

		this.systemLifeTime += elapsedTime;
	}

	render() {
		const ctx = this.canvas.getContext('2d')!;

		// Draw squares for each particle
		for (let idx = 0; idx < this.particles.length; idx++) {
			const particle = this.particles[idx];

			let color = 'rgba(255, 0, 0, 0.5)';
			if (particle.color) color = particle.color;

			let translatedPos = this.renderer.translateGamePositionToCanvas(particle.position);
			const halfWidth = particle.width! / 2;

			ctx.fillStyle = color; // Set fill color

			// Draw square
			ctx.fillRect(translatedPos.x - halfWidth, translatedPos.y - halfWidth, 10, 10);
		}
	}

	/**
	 * Generate particles for 't' miliseconds then stops generating particles
	 * Requires you to manually turn on system again.
	 */
	turnOffAfter(t: number) {
		if (t <= 0) return;
		this.offAfterTimer = t;
		this.offAfterFlag = true;
	}

	/**
	 * Turns system back on
	 */
	turnOn() {
		this.offAfterTimer = 0;
		this.offAfterFlag = false;
		this.generateParticles = true;
	}

	/**
	 * Updates the positioning of the particle system
	 */
	updateSystemPosition(position: Position) {
		this.position = position;
	}

	getNumOfParticles(): number {
		return this.numOfParticles;
	}
}
