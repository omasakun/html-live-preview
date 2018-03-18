export interface MatchOutputLeaf<KIND> {
	start: number
	len: number
	data: string[]
	kind: KIND
}
export interface MatchOutputBranch<KIND> {
	start: number
	len: number
	children: MatchOutput<KIND>[]
	kind: KIND
}
export type MatchOutput<KIND> = MatchOutputBranch<KIND> | MatchOutputLeaf<KIND>;
export interface Pattern<KIND> {
	getMatch(source: string, start: number): MatchOutput<KIND> | undefined
}
export class StringPattern<KIND> implements Pattern<KIND> {
	kind: KIND
	match: string
	converter: (match: string) => string[]
	constructor(kind: KIND, match: string,
		converter: (match: string) => string[] = ((_) => [_])) {
		this.kind = kind
		this.match = match;
		this.converter = converter;
	}
	getMatch(source: string, start: number): MatchOutputLeaf<KIND> {
		var tmp = source.indexOf(this.match, start);
		if (tmp < 0) return undefined;
		return {
			data: this.converter(this.match),
			kind: this.kind,
			len: this.match.length,
			start: tmp
		}
	}
}
export class RegExpPattern<KIND> implements Pattern<KIND> {
	kind: KIND
	match: RegExp
	converter: (match: RegExpExecArray) => string[]
	constructor(kind: KIND, match: RegExp,
		converter: (match: RegExpExecArray) => string[] = ((_) => _.map(_ => _))) {
		this.kind = kind
		this.match = match;
		this.converter = converter;
	}
	getMatch(source: string, start: number): MatchOutputLeaf<KIND> {
		var tmp = this.match.exec(source.substr(start));
		if (tmp == null) return undefined;
		return {
			data: this.converter(tmp),
			kind: this.kind,
			len: tmp[0].length,
			start: tmp.index + start
		}
	}
}
export class RacePattern<KIND> implements Pattern<KIND> {
	kind: KIND
	match: Pattern<KIND>[]
	allowNoise: boolean
	converter: (match: MatchOutput<KIND>) => MatchOutput<KIND>
	constructor(kind: KIND, allowNoise: boolean, match: Pattern<KIND>[], converter: (match: MatchOutput<KIND>) => MatchOutput<KIND> = (_ => _)) {
		this.kind = kind
		this.match = match;
		this.converter = converter;
		this.allowNoise = allowNoise;
	}
	getMatch(source: string, start: number): MatchOutputBranch<KIND> {
		var tmp: MatchOutput<KIND>;
		for (let i = 0; i < this.match.length; i++) {
			var tmp2 = this.match[i].getMatch(source, start);
			if (tmp2 == undefined || (tmp2.start != start && !this.allowNoise)) continue;
			if (tmp == undefined || tmp.start > tmp2.start) tmp = tmp2;
		}
		if (tmp == undefined) return undefined;
		return {
			children: [this.converter(tmp)],
			kind: this.kind,
			len: tmp.len,
			start: tmp.start
		}
	}
}
export class SequentialPattern<KIND, T> implements Pattern<KIND> {
	kind: KIND
	match: Pattern<KIND>[]
	allowNoise: boolean
	converter: (match: MatchOutput<KIND>[]) => MatchOutput<KIND>[]
	constructor(kind: KIND, allowNoise: boolean, match: Pattern<KIND>[],
		converter: (match: MatchOutput<KIND>[]) => MatchOutput<KIND>[] = (_ => _)) {
		this.kind = kind
		this.match = match;
		this.converter = converter;
		this.allowNoise = allowNoise;
	}
	getMatch(source: string, start: number): MatchOutputBranch<KIND> {
		var tmp: MatchOutput<KIND>[] = [];
		var crnt = start;
		for (let i = 0; i < this.match.length; i++) {
			var tmp2: MatchOutput<KIND>;
			tmp2 = this.match[i].getMatch(source, crnt);
			if (tmp2 == undefined || (tmp2.start != crnt && !this.allowNoise)) return undefined;
			crnt = tmp2.start + tmp2.len;
			tmp.push(tmp2);
		}
		return {
			children: this.converter(tmp),
			kind: this.kind,
			len: tmp.length == 0 ? 0 : crnt - tmp[0].start,
			start: tmp.length == 0 ? start : tmp[0].start
		}
	}
}
export class RepeatPattern<KIND, T> implements Pattern<KIND> {
	kind: KIND
	match: Pattern<KIND>
	allowNoise: boolean
	allowZero: boolean
	converter: (match: MatchOutput<KIND>[]) => MatchOutput<KIND>[]
	constructor(kind: KIND, allowNoise: boolean, allowZero: boolean, match: Pattern<KIND>,
		converter: (match: MatchOutput<KIND>[]) => MatchOutput<KIND>[] = (_ => _)) {
		this.kind = kind
		this.match = match;
		this.converter = converter;
		this.allowNoise = allowNoise;
		this.allowZero = allowZero;
	}
	getMatch(source: string, start: number): MatchOutputBranch<KIND> {
		var tmp: MatchOutput<KIND>[] = [];
		var crnt = start;
		for (var i = 0; true; i++) {
			var tmp2: MatchOutput<KIND>;
			tmp2 = this.match.getMatch(source, crnt);
			if (tmp2 == undefined || (tmp2.start != crnt && !this.allowNoise)) break;
			crnt = tmp2.start + tmp2.len;
			tmp.push(tmp2);
		}
		if (i == 0 && !this.allowZero) return undefined;
		return {
			children: this.converter(tmp),
			kind: this.kind,
			len: tmp.length == 0 ? 0 : crnt - tmp[0].start,
			start: tmp.length == 0 ? start : tmp[0].start
		}
	}
}
export function Str<KIND>(kind: KIND, match: string,
	converter?: (match: string) => string[]) {
	return new StringPattern(kind, match, converter);
}
export function Reg<KIND>(kind: KIND, match: RegExp,
	converter?: (match: RegExpExecArray) => string[]) {
	return new RegExpPattern(kind, match, converter);
}
export function Race<KIND>(kind: KIND, allowNoise: boolean, match: Pattern<KIND>[],
	converter?: (match: MatchOutput<KIND>) => MatchOutput<KIND>) {
	return new RacePattern(kind, allowNoise, match, converter);
}
export function Seq<KIND>(kind: KIND, allowNoise: boolean, match: Pattern<KIND>[],
	converter?: (match: MatchOutput<KIND>[]) => MatchOutput<KIND>[]) {
	return new SequentialPattern(kind, allowNoise, match, converter);
}
export function Repeat<KIND>(kind: KIND, allowNoise: boolean, allowZero: boolean, match: Pattern<KIND>,
	converter?: (match: MatchOutput<KIND>[]) => MatchOutput<KIND>[]) {
	return new RepeatPattern(kind, allowNoise, allowZero, match, converter);
}
export function toString<KIND>(input: MatchOutput<KIND>) {
	if ("data" in input) {
		return input.start + "-" + (input.start + input.len - 1) + ":" + input.kind + "[" + input.data.join("|") + "]";
	} else {
		return input.start + "-" + (input.start + input.len - 1) + ":" + input.kind + "[" + input.children.map(v => "\n"+toString(v).split("\n").map(v=>"  "+v).join("\n")).join("") + "\n]";
	}
}