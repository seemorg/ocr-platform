import slugify from "slugify";

const removeDiacritics = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const textToSlug = (text: string) => {
  return slugify(removeDiacritics(text), {
    lower: true,
    trim: true,
  });
};
