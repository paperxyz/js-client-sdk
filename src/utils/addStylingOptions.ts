import { ICustomizationOptions } from "src/interfaces/ICustomizationOptions";

export function addStylingOptions(link: URL, options: ICustomizationOptions) {
  if (options.colorPrimary) {
    link.searchParams.append("colorPrimary", options.colorPrimary);
  }
  if (options.colorBackground) {
    link.searchParams.append("colorBackground", options.colorBackground);
  }
  if (options.colorText) {
    link.searchParams.append("colorText", options.colorText);
  }
  if (options.borderRadius !== undefined) {
    link.searchParams.append("borderRadius", options.borderRadius.toString());
  }
  if (options.fontFamily) {
    link.searchParams.append("fontFamily", options.fontFamily);
  }
}
