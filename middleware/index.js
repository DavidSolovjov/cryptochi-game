
export default class {


  static async pre_render(page, req, ctx) {
    try {

      return ctx;
    } catch (e) {
      console.error(e.stack);
      return ctx;
    }
  }

  static async post_render(page, req, html) {
    try {

      return html;
    } catch (e) {
      console.error(e.stack);
      return html;
    }
  }
}
