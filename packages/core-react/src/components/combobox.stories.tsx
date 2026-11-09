import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentProps } from 'react'
import { expect, screen, waitFor } from 'storybook/test'

import { Button } from './button.js'
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from './combobox.js'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './dialog.js'
import { Field, FieldLabel } from './field.js'

const FRAMEWORKS = ['Next.js', 'SvelteKit', 'Nuxt', 'Remix', 'Astro']

/** Waits for the open listbox and out its enter animation. */
const openList = async () => {
	const listbox = await screen.findByRole('listbox')
	await waitFor(() => expect(listbox).toBeVisible())
	return listbox
}

/** The single-value combobox most stories render; `args` go to its input. */
const FrameworkCombobox = ({ id = 'framework', ...args }: ComponentProps<typeof ComboboxInput>) => (
	<Field>
		<FieldLabel htmlFor={id}>Framework</FieldLabel>
		<Combobox items={FRAMEWORKS}>
			<ComboboxInput id={id} placeholder="Pick a framework" {...args} />
			<ComboboxContent>
				<ComboboxEmpty>No frameworks found.</ComboboxEmpty>
				<ComboboxList aria-label="Frameworks">
					{(item: string) => (
						<ComboboxItem key={item} value={item}>
							{item}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	</Field>
)

/**
 * `title` is the library component's Penpot path. The input's `showTrigger` / `showClear` and
 * the `multiple` chips are the stories; the integration tier drives them through `combobox()`.
 */
const meta = {
	title: 'Components/Combobox',
	component: ComboboxInput,
	render: (args) => (
		<div className="flex h-screen items-start justify-center p-8">
			<FrameworkCombobox {...args} />
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole('combobox', { name: 'Framework' })
		await expect(input.parentElement?.getBoundingClientRect().height).toBe(36)
		await userEvent.type(input, 'sv')
		await openList()
		await expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['SvelteKit'])
		await userEvent.click(screen.getByRole('option', { name: 'SvelteKit' }))
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
		await expect(input).toHaveValue('SvelteKit')
	},
} satisfies Meta<typeof ComboboxInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** No match shows the empty message. */
export const Empty: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.type(canvas.getByRole('combobox', { name: 'Framework' }), 'zzz')
		const empty = await screen.findByText('No frameworks found.')
		await waitFor(() => expect(empty).toBeVisible())
		await expect(screen.queryAllByRole('option')).toEqual([])
	},
}

/** `showClear` swaps the chevron for a clear button once there is a value. */
export const WithClear: Story = {
	args: { showClear: true },
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole('combobox', { name: 'Framework' })
		await userEvent.type(input, 'Astro')
		await openList()
		await userEvent.click(screen.getByRole('option', { name: 'Astro' }))
		await expect(input).toHaveValue('Astro')
		await userEvent.click(canvas.getByRole('button', { name: /clear/i }))
		await expect(input).toHaveValue('')
	},
}

/** A disabled input fades and doesn't open. */
export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		const input = canvas.getByRole('combobox', { name: 'Framework' })
		await expect(input).toBeDisabled()
		await expect(getComputedStyle(input).opacity).toBe('0.5')
	},
}

/**
 * `multiple`: each pick is a chip, and the pick clears the filter and closes the popup (Base UI
 * trap 4, kept); `combobox().select(...labels)` reopens the popup for each label.
 */
export const Multiple: Story = {
	render: () => {
		const anchor = useComboboxAnchor()
		return (
			<div className="flex h-screen items-start justify-center p-8">
				<Field>
					<FieldLabel htmlFor="frameworks">Frameworks</FieldLabel>
					<Combobox multiple items={FRAMEWORKS} defaultValue={['Next.js']}>
						<ComboboxChips ref={anchor}>
							<ComboboxValue>
								{(values: string[]) => (
									<>
										{values.map((value) => (
											<ComboboxChip key={value}>{value}</ComboboxChip>
										))}
										<ComboboxChipsInput
											id="frameworks"
											placeholder="Add a framework"
										/>
									</>
								)}
							</ComboboxValue>
						</ComboboxChips>
						<ComboboxContent anchor={anchor}>
							<ComboboxEmpty>No frameworks found.</ComboboxEmpty>
							<ComboboxList aria-label="Frameworks">
								{(item: string) => (
									<ComboboxItem key={item} value={item}>
										{item}
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</Field>
			</div>
		)
	},
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole('combobox', { name: 'Frameworks' })
		await expect(canvas.getByText('Next.js').getBoundingClientRect().height).toBe(22)
		await userEvent.type(input, 'nu')
		await openList()
		const nuxt = screen.getByRole('option', { name: 'Nuxt' })
		const resting = getComputedStyle(nuxt).backgroundColor
		await userEvent.hover(nuxt)
		await waitFor(() => expect(nuxt).toHaveAttribute('data-highlighted'))
		await expect(getComputedStyle(nuxt).backgroundColor).not.toBe(resting)
		await userEvent.click(nuxt)
		await expect(canvas.getByText('Nuxt')).toBeVisible()
		await expect(input).toHaveValue('')
	},
}

/**
 * A combobox opened from inside a dialog. Escape closes only the popup, the top layer, and
 * leaves the dialog open (Base UI trap 1); the integration tier proves it.
 */
export const InDialog: Story = {
	render: (args) => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Edit project</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit project</DialogTitle>
					<DialogDescription>Change the project's framework.</DialogDescription>
				</DialogHeader>
				<FrameworkCombobox id="framework-in-dialog" {...args} />
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit project' }))
		const dialog = await screen.findByRole('dialog', { name: 'Edit project' })
		await waitFor(() => expect(dialog).toBeVisible())
		await userEvent.click(screen.getByRole('combobox', { name: 'Framework' }))
		await openList()
	},
}
