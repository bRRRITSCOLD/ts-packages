import { resolve } from 'node:path'

// node_modules
import {
	type CodeManifest,
	type CodeProp,
	compareCodeUnits,
} from '@brrritscold/design-core-js/code-manifest'
import ts from 'typescript'

/** Where core-react's built declarations are: the `.` entry and the `./icons` entry. */
export type CodeManifestSources = {
	/** The `.d.ts` of the `.` entry, such as `dist/index.d.ts`. */
	entry: string
	/** The `.d.ts` of the `./icons` entry, such as `dist/icons.d.ts`. */
	icons: string
}

/** Sorts by name in code-unit order, so the manifest is the same on every machine. */
const byName = (a: { name: string }, b: { name: string }) => compareCodeUnits(a.name, b.name)

/** An icon export: `<Name>Icon`, the alias the component link uses for an icon component. */
const ICON_EXPORT = /^[A-Z][A-Za-z0-9]*Icon$/

const valueExportsOf = (checker: ts.TypeChecker, file: ts.SourceFile) => {
	const module = checker.getSymbolAtLocation(file)
	if (!module) throw new Error(`${file.fileName} is not a module`)
	return checker
		.getExportsOfModule(module)
		.map((symbol) => ({
			name: symbol.name,
			symbol: symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol,
		}))
		.filter(({ symbol }) => symbol.flags & ts.SymbolFlags.Value)
}

/** A prop's type as the component link can set it, or `undefined` when no variant value can. */
const toCodeProp = (
	checker: ts.TypeChecker,
	type: ts.Type,
	optional: boolean
): CodeProp | undefined => {
	const members = (type.isUnion() ? type.types : [type]).filter(
		(member) => !(member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
	)
	const isBoolean = (member: ts.Type) =>
		(member.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0
	if (!members.length) return undefined
	if (members.every(isBoolean)) return { type: 'boolean', optional }
	const values: string[] = []
	for (const member of members) {
		if (member.isStringLiteral() || member.isNumberLiteral()) values.push(String(member.value))
		else if (isBoolean(member)) values.push(checker.typeToString(member))
		else return undefined
	}
	return { type: 'literals', values: values.sort(), optional }
}

/** A component's boolean and literal-union props, read from its first call or construct parameter. */
const propsOf = (checker: ts.TypeChecker, name: string, symbol: ts.Symbol) => {
	const props: Record<string, CodeProp> = {}
	if (!/^[A-Z]/.test(name)) return props
	const type = checker.getTypeOfSymbol(symbol)
	const [signature] = [...type.getCallSignatures(), ...type.getConstructSignatures()]
	const [parameter] = signature?.parameters ?? []
	if (!parameter) return props
	const propsType = checker.getTypeOfSymbol(parameter)
	for (const prop of checker.getPropertiesOfType(propsType).sort(byName)) {
		const codeProp = toCodeProp(
			checker,
			checker.getTypeOfSymbol(prop),
			(prop.flags & ts.SymbolFlags.Optional) !== 0
		)
		if (codeProp) props[prop.name] = codeProp
	}
	return props
}

/**
 * Generates the code manifest from core-react's built declarations with the TypeScript compiler
 * API: every value export of the `.` entry with its boolean and literal-union props, and the
 * `<Name>Icon` exports of the `./icons` entry.
 */
export const generateCodeManifest = ({ entry, icons }: CodeManifestSources): CodeManifest => {
	const [entryPath, iconsPath] = [resolve(entry), resolve(icons)]
	const program = ts.createProgram([entryPath, iconsPath], {
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
	})
	const checker = program.getTypeChecker()
	const sourceFile = (path: string) => {
		const file = program.getSourceFile(path)
		if (!file) throw new Error(`Cannot read ${path}`)
		return file
	}

	const exports: CodeManifest['exports'] = {}
	for (const { name, symbol } of valueExportsOf(checker, sourceFile(entryPath)).sort(byName))
		exports[name] = { props: propsOf(checker, name, symbol) }

	return {
		exports,
		icons: valueExportsOf(checker, sourceFile(iconsPath))
			.map(({ name }) => name)
			.filter((name) => ICON_EXPORT.test(name))
			.sort(),
	}
}
