export const GENERAL_INTEREST = 'General enquiry'
export const BOOKING_INTEREST = 'Booking / studio session'
export const FILM_GAMES_INTEREST = 'Film / games work'
export const PRODUCER_INTEREST = 'Producer / engineer / sound designer'
export const COLLABORATION_INTEREST = 'Artist / music collaboration'

export const CONTACT_INTEREST_OPTIONS = [
  { value: GENERAL_INTEREST, label: GENERAL_INTEREST },
  { value: BOOKING_INTEREST, label: BOOKING_INTEREST },
  { value: FILM_GAMES_INTEREST, label: FILM_GAMES_INTEREST },
  { value: PRODUCER_INTEREST, label: PRODUCER_INTEREST },
  { value: COLLABORATION_INTEREST, label: COLLABORATION_INTEREST },
] as const
