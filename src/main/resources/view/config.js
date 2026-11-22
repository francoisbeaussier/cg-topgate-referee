import { GraphicEntityModule } from './entity-module/GraphicEntityModule.js';
import { EndScreenModule } from './endscreen-module/EndScreenModule.js';
import { FpvModule, fpvOptions } from './FpvModule.js';

export const modules = [
	GraphicEntityModule,
	FpvModule,
	EndScreenModule
];

export const playerColors = [
	'#ff4d6d',
	'#4dff88',
	'#ffb84d',
	'#b84dff'
];

export const options = [
	{
		title: 'VIEW',
		get: () => fpvOptions.view,
		set: (value) => { fpvOptions.view = value; FpvModule.refresh(); },
		values: { 'ME': -2, 'LEAD': -3, 'SPLIT': -1, 'P1': 0, 'P2': 1, 'P3': 2, 'P4': 3 }
	},
	{
		title: 'CAMERA',
		get: () => fpvOptions.chase,
		set: (value) => { fpvOptions.chase = value; FpvModule.refresh(); },
		values: { 'FPV': 0, 'CHASE': 1, 'TV': 2 }
	},
	{
		title: 'SOUND',
		get: () => fpvOptions.sound,
		set: (value) => { fpvOptions.sound = value; FpvModule.setSound(value); },
		values: { 'OFF': 0, 'FX': 1, 'MUSIC': 2, 'ALL': 3 }
	},
	{
		title: 'SPEED',
		get: () => fpvOptions.units,
		set: (value) => { fpvOptions.units = value; FpvModule.refresh(); },
		values: { 'KM/H': 0, 'MPH': 1, 'UNITS': 2 }
	},
	{
		title: 'SMOOTH',
		get: () => fpvOptions.smooth,
		set: (value) => { fpvOptions.smooth = value; FpvModule.refresh(); },
		values: { 'ON': 1, 'OFF': 0 }
	}
];
