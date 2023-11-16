import {Movie, Review} from '../shared/types'

export const movies : Movie[]= [
  {
    movieId: 1,
    genre_ids: [12, 14, 28],
    original_language: 'en',
    overview:
      "A young boy, Harry Potter, discovers his magical heritage and attends Hogwarts School of Witchcraft and Wizardry.",
    popularity: 862.824,
    release_date: "2001-11-16",
    title: "Harry Potter and the Sorcerer's Stone",
    video: false,
    vote_average: 7.9,
    vote_count: 18067,
  },
  {
    movieId: 2,
    genre_ids: [12, 14, 28],
    original_language: 'en',
    overview:
      "Frodo and the Fellowship embark on a journey to destroy the One Ring and end Sauron's reign over Middle-earth.",
    popularity: 1117.073,
    release_date: "2001-12-19",
    title: "The Lord of the Rings: The Fellowship of the Ring",
    video: false,
    vote_average: 8.3,
    vote_count: 18754,
  },
  {
    movieId: 3,
    genre_ids: [12, 14, 28],
    original_language: 'en',
    overview:
      "In the future, a young man discovers he's the son of a powerful wizard and must defeat an evil witch to end her reign of terror.",
    popularity: 432.898,
    release_date: "2007-07-11",
    title: "Harry Potter and the Order of the Phoenix",
    video: false,
    vote_average: 7.8,
    vote_count: 14372,
  },
];

export const reviews: Review[] = [
  {
    movieId: 1,
    username: "reviewer1",
    review: "The movie was a thrilling adventure from start to finish! The storyline was incredibly engaging, weaving magic and mystery seamlessly. The characters were well-developed, and the special effects were stunning. A must-watch for fantasy enthusiasts!",
    rating: 10,
    reviewDate: "2021-08-15",
  },
  {
    movieId: 1,
    username: "reviewer2",
    review: "An enchanting cinematic experience! The visual effects and attention to detail were awe-inspiring. The cast delivered exceptional performances, bringing the magical world to life. A fantastic adaptation that captures the essence of the original story.",
    rating: 9,
    reviewDate: "2021-09-05",
  },
  {
    movieId: 2,
    username: "reviewer3",
    review: "An epic tale that takes you on an unforgettable journey! The scenic landscapes and intricate storytelling transport you to a mesmerizing realm. The depth of the characters and the emotional resonance of the narrative make it a timeless masterpiece.",
    rating: 10,
    reviewDate: "2021-07-25",
  }
];