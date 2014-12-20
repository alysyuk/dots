/**
 * The template handler just keeps our mustache templates
 * and wraps basic things like loading the templates and rendering them
 */
var TemplateHandler = function (templates) {
    this.templates = templates;
    this.templateFileContent = {};
    this.numberOfTemplates = 0;
    // Get templates count
    for (var name in this.templates) {
        this.numberOfTemplates = this.numberOfTemplates + 1;
    }
}

/**
 * Load all the templates using jquery and save them in our internal
 * cache
 */
TemplateHandler.prototype.start = function (callback) {
    var counter = this.numberOfTemplates;
    var self = this;

    for (var name in this.templates) {
        // Execute each get in it's own context
        var wrapperFunction = function (templateName, templateLocation) {

            // Load the initial mustache template
            $.get(self.templates[name], function (template) {
                counter = counter - 1;
                console.log("loaded template: " + templateName + " at " + templateLocation);

                // Store the template in the file content cache
                self.templateFileContent[templateName] = template;
                if (counter == 0)
                    callback();
            })
        }

        // Wrap the load to ensure we keep the scope local to the function
        wrapperFunction(name, this.templates[name])
    }
}

/**
 * Render a template by the template name and then set a div with the rendered template, the context is an
 * object of values used in the template
 */
TemplateHandler.prototype.setTemplate = function (id, templateName, context) {
    var container = $(id);
    // If there is no such HTML container throw an error
    if (container == null || container.html == null)
        throw new Error("no container " + id);
    // If the template does not exist throw an error
    if (this.templateFileContent[templateName] == null)
        throw new Error("no template name " + templateName + " loaded");
    // Ensure at least empty context
    context = context == null ? {} : context;
    // Render template
    var renderedTemplate = Mustache.render(this.templateFileContent[templateName], context);
    // No error render the template
    container.html(renderedTemplate);
}

/**
 * Verify if a template exists
 */
TemplateHandler.prototype.isTemplate = function (templateName) {
    return this.templateFileContent[templateName] != null;
}

/**
 * Just render a template and return the text
 */
TemplateHandler.prototype.render = function (templateName, context) {
    // If the template does not exist throw an error
    if (this.templateFileContent[templateName] == null)
        throw new Error("no template name " + templateName + " loaded");
    // Ensure at least empty context
    context = context == null ? {} : context;
    // Render template
    return Mustache.render(this.templateFileContent[templateName], context);
}