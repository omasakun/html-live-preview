import * as util from "util";
import * as assert from "assert";
enum Colors {
	black = '\u001b[30m',
	red = '\u001b[31m',
	green = '\u001b[32m',
	yellow = '\u001b[33m',
	blue = '\u001b[34m',
	magenta = '\u001b[35m',
	cyan = '\u001b[36m',
	white = '\u001b[37m',
	reset = '\u001b[0m',
}
interface Outputter {
	init(): void
	update(result: TestResultTree[], logLevel: LogLevel): void
	finalize(): void
}
export class ConsoleOutputter {
	private passText = Colors.green + "O" + Colors.reset;
	private failText = Colors.red + "X" + Colors.reset;
	init(): void {
		console.log("== Start Test Log ==");
	}
	private getText(_: TestResultTree[], logLevel: LogLevel): { text: string[], pass: number, fail: number } {
		var result: string[] = [];
		var pass = 0, fail = 0;
		_.forEach(v => {
			if ("_" in v) {
				if (logLevel > 0 || !v._.passed) {
					result.push(
						...(
							(v._.passed ? this.passText : this.failText)
							+ " "
							+ v._.type
							+ (!v._.label ? "" : " " + v._.label)
							+ (!v._.log ? "" : "\n" + v._.log.split("\n").map(vv => (v._.passed ? Colors.green : Colors.red) + "  " + Colors.reset + vv).join("\n"))
						).split("\n")
					);
				}
				v._.passed ? pass++ : fail++;
			} else {
				var tmp = this.getText(v.branch, logLevel - 1);
				result.push(Colors.yellow
					+ "*" + (tmp.fail == 0 ? Colors.yellow : Colors.red) + " [" + tmp.pass + " / " + (tmp.pass + tmp.fail) + "] "
					+ Colors.yellow + (v.label || "group") + Colors.reset);
				pass += tmp.pass; fail += tmp.fail;
				result.push(...tmp.text.map(v => "  " + v));
			}
		});
		return { text: result, fail, pass };
	}
	update(result: TestResultTree[], logLevel: LogLevel): void {
		var tmp = this.getText(result, logLevel);
		console.log(Colors.green + "== Result [" + tmp.pass + " / " + (tmp.pass + tmp.fail) + "] ==\n" + Colors.reset + tmp.text.join("\n"));
	}
	finalize(): void {
		console.log("== End Test Log ==");
	}
}
export enum LogLevel {
	all = Infinity,
	failOnly = 0
}
type TestResultTree =
	{ branch: TestResultTree[], label?: string } | { _: TestResult };
interface TestResult {
	type: string,
	passed: boolean,
	label?: string,
	log?: string
}
export function startTest(enable: boolean, logLevel: LogLevel, out: Outputter, fn: (testObj: Tests) => void) {
	if (!enable) return;
	var testObj = new Tests();
	out.init();
	testObj.notThrow(() => fn(testObj), "Test-itself");
	out.update(testObj._messages, logLevel);
	out.finalize();
}
class Tests {
	_messages: TestResultTree[] = []
	private addMsg(passed: boolean, type: string, label?: string, log?: string) {
		var item: TestResult = {
			passed: passed,
			type: type
		};
		if (label !== undefined) item.label = label;
		if (log !== undefined) item.log = log;
		this._messages.push({ _: item });
	}
	verify<T>(actual: T, verifier: (input: T) => boolean, label?: string) {
		var successed = verifier(actual);
		if (successed) this.addMsg(successed, "Verify", label);
		else this.addMsg(successed, "Verify", label,
			"== actual ==\n" + util.inspect(actual, { colors: true }));
	}
	equal<T>(actual: T, expected: T, label?: string) {
		try {
			assert.deepEqual(actual, expected);
			this.addMsg(true, "Equal", label);
		} catch (error) {
			this.addMsg(false, "Equal", label,
				"== actual ==\n" + util.inspect(actual, { colors: true }) + "\n== expected ==\n" + util.inspect(expected, { colors: true }));
		}
	}
	ok(input: boolean, label?: string) {
		this.addMsg(input, "OK", label);
	}
	fail(label?: string) {
		this.addMsg(false, "Fail", label);
	}
	notThrow<T>(fn: () => any, label?: string) {
		try {
			fn();
			this.addMsg(true, "NotThrow", label);
		} catch (error) {
			this.addMsg(false, "NotThrow", label,
				("== error ==\n" + util.inspect(error, { colors: true })));
		}
	}
	group(label: string, fn: (testObj: Tests) => void) {
		var tmp = new Tests();
		try {
			fn(tmp);
		} catch (error) {
			this.addMsg(false, "TestFn-itself", label,
				("== error ==\n" + util.inspect(error, { colors: true })));
		}
		var tmp2: TestResultTree = { branch: tmp._messages };
		if (label !== undefined) tmp2.label = label;
		this._messages.push(tmp2);
	}
}