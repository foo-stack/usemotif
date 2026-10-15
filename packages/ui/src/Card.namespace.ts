import { CardBody, CardFooter, CardHeader, CardMedia, CardRoot } from './Card.js';

/** `Card`, with `Card.Header`, `Card.Body`, `Card.Footer` and `Card.Media` parts. */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Media: CardMedia,
});
