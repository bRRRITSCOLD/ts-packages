/** A row of the data table's stories and tests: shadcn's data-table guide's payment. */
export type Payment = {
	id: string
	email: string
	amount: number
	status: 'pending' | 'processing' | 'success' | 'failed'
}

const NAMES = [
	'ken',
	'abe',
	'monserrat',
	'silas',
	'carmella',
	'jason',
	'lucia',
	'omar',
	'priya',
	'tomas',
	'wanda',
	'yusuf',
]
const AMOUNTS = [316, 242, 837, 874, 721, 150, 489, 63, 905, 274, 518, 99]
const STATUSES: Payment['status'][] = ['success', 'processing', 'failed', 'pending']

/**
 * `count` payments in a fixed order, a fresh array on every call: `pay-1` is ken's, and the
 * emails, amounts and statuses repeat every twelve rows.
 */
export const payments = (count = NAMES.length): Payment[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `pay-${i + 1}`,
		email: `${NAMES[i % NAMES.length]}${i < NAMES.length ? '' : i}@example.com`,
		amount: AMOUNTS[i % AMOUNTS.length] ?? 0,
		status: STATUSES[i % STATUSES.length] ?? 'pending',
	}))
