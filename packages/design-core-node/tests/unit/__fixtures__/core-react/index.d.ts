// A stand-in for core-react's built `.` entry: components, a cva config, a helper, a type.
type ButtonVariant = 'default' | 'outline'

/** A component type with a call signature, the shape `forwardRef` components have. */
interface Component<P> {
	(props: P): unknown
	displayName?: string
}

export interface ButtonProps {
	variant?: ButtonVariant | null
	size?: 'default' | 'sm'
	disabled?: boolean
	asChild?: boolean
	className?: string
	onClick?: () => void
}

export declare function Button(props: ButtonProps): unknown
export declare const buttonVariants: (props?: { variant?: ButtonVariant | null }) => string

export declare const Badge: Component<{ variant?: 'default' | 'secondary'; children?: unknown }>

interface CardProps {
	className?: string
}
export declare const Card: Component<CardProps>
export declare const CardHeader: Component<CardProps>
export declare const CardContent: Component<CardProps>

export declare function Toggle(props: { pressed: boolean; tone?: 'quiet' | 'loud' | boolean }): unknown

export declare function cn(...inputs: unknown[]): string
