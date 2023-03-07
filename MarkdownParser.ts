enum TagType {
    Paragraph,
    Header1,
    Header2,
    Header3,
    Header4,
    Header5,
    Header6,
    Bullet,
    HorizontalRule
}

class TagTypeToHtml {   
    private readonly tagType: Map<TagType, string> = new Map<TagType, string>();
    constructor () {
        this.tagType.set(TagType.Paragraph, "p");
        this.tagType.set(TagType.Header1, "h1");
        this.tagType.set(TagType.Header2, "h2");
        this.tagType.set(TagType.Header3, "h3");
        this.tagType.set(TagType.Header4, "h4");
        this.tagType.set(TagType.Header5, "h5");
        this.tagType.set(TagType.Header6, "h6");
        this.tagType.set(TagType.Bullet, "li");
        this.tagType.set(TagType.HorizontalRule, "hr");
    }

    private GetTag(tagType: TagType, openingTagPattern: string): string {
        let tag = this.tagType.get(tagType);

        if (tag !== null) {
            return `${openingTagPattern}${tag}>`;
        }
        return `${openingTagPattern}p>`;
    }

    public OpeningTag(tagType: TagType): string {
        return this.GetTag(tagType, '<');
    }

    public ClosingTag(tagType: TagType): string {
        return this.GetTag(tagType, '</');
    }
}

interface IMarkdownDocument {
    Add(...content: string[]): void;
    Get(): string;
}

class MardownDocument implements IMarkdownDocument {
    private content: string = "";

    Add(...content: string[]) {
        content.forEach(element => this.content += element)
    }

    Get() {
        return this.content;
    }
}

class ParseElement {
    CurrentLine: string = "";
}

interface IVisitor {
    Visit(token: ParseElement, markdownDocument: IMarkdownDocument): void;
}

interface IVisitable {
    Accept(visitor: IVisitor, token: ParseElement, markdownDocument: IMarkdownDocument): void;
}

abstract class VisitorBase implements IVisitor {
    constructor(private readonly tagType: TagType, private readonly TagTypeToHtml: TagTypeToHtml) {}
    private identifyBoldOrItalic(text: string): string {
        const bold = new RegExp(/\*\*(.*?)\*\*/gm);
        const italic = new RegExp(/\_\_(.*?)\_\_/gm);
        const result = text.replace(bold, '<strong>$1</strong>').replace(italic, '<i>$1</i>')
        return result;
    }
    Visit(token: ParseElement, markdownDocument: IMarkdownDocument): void {
        markdownDocument.Add(this.TagTypeToHtml.OpeningTag(this.tagType), this.identifyBoldOrItalic(token.CurrentLine), this.TagTypeToHtml.ClosingTag(this.tagType));
    }
}

class Header1Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header1, new TagTypeToHtml());
    }
}

class Header2Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header2, new TagTypeToHtml());
    }
}

class Header3Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header3, new TagTypeToHtml());
    }
}

class Header4Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header4, new TagTypeToHtml());
    }
}

class Header5Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header5, new TagTypeToHtml());
    }
}

class Header6Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header6, new TagTypeToHtml())
    }
}

class BulletVisitor extends VisitorBase {
    constructor() {
        super(TagType.Bullet, new TagTypeToHtml());
    }
}
class ParagraphVisitor extends VisitorBase {
    constructor() {
        super(TagType.Paragraph, new TagTypeToHtml());
    }
}

class HorizontalRuleVisitor extends VisitorBase {
    constructor() {
        super(TagType.HorizontalRule, new TagTypeToHtml());
    }
}

class Visitable implements IVisitable {
    Accept(visitor: IVisitor, token: ParseElement, markdownDocument: IMarkdownDocument) {
        visitor.Visit(token, markdownDocument)
    }
}

abstract class Handler<T> {
    protected next: Handler<T> | null = null;

    public setNext(next: Handler<T>): void {
        this.next = next;
    }

    public HandleRequest(request: T) : void {
        if(!this.CanHandle(request)) {
            if(this.next !== null) {
                this.next.HandleRequest(request);
            }
            return;
        }
    }

    protected abstract CanHandle(request: T) : boolean;
}

class ParseChainHandler extends Handler<ParseElement> {
    private readonly visitable: IVisitable  = new Visitable();
    constructor (private readonly document: IMarkdownDocument,
        private readonly tagType: string,
        private readonly visitor: IVisitor) {
            super();
    }

    protected CanHandle(request: ParseElement): boolean {
        let split = new LineParser().Parse(request.CurrentLine, this.tagType);
        if(split[0]) {
            request.CurrentLine = split[1];
            this.visitable.Accept(this.visitor, request, this.document);
        }
        return split[0];
    }
}

class LineParser {
    public Parse(value: string, tag: string) : [boolean, string] {
        let output: [boolean, string] = [false, ""];
        output[1] = value;
        if(value === "") {
            return output;
        }
        let split = value.startsWith(`${tag}`);
        if(split) {
            output[0] = true;
            output[1] = value.substring(tag.length);
        }

        return output;
    }
}

class ParagraphHandler extends Handler<ParseElement> {
    private readonly visitable: IVisitable = new Visitable();
    private readonly visitor: IVisitor = new ParagraphVisitor();
    protected CanHandle(request: ParseElement): boolean {
        this.visitable.Accept(this.visitor, request, this.document);
        return true;
    }
    constructor(private readonly document: IMarkdownDocument) {
        super();
    }
}

class Header1ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "# ", new Header1Visitor());
    }
}

class Header2ChainHanlder extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "## ", new Header2Visitor());
    }
}

class Header3ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "### ", new Header3Visitor());
    }
}

class Header4ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "#### ", new Header4Visitor());
    }
}
class Header5ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "##### ", new Header5Visitor());
    }
}
class Header6ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "###### ", new Header6Visitor());
    }
}
class BulletChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "- ", new BulletVisitor());
    }
}

class HorizontalRuleHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "---", new HorizontalRuleVisitor());
    }
}

class ChainOfResponsabilityFactory {
    Build(document: IMarkdownDocument): ParseChainHandler {
        let header1: Header1ChainHandler = new Header1ChainHandler(document);
        let header2: Header2ChainHanlder = new Header2ChainHanlder(document);
        let header3: Header3ChainHandler = new Header3ChainHandler(document);
        let header4: Header4ChainHandler = new Header4ChainHandler(document);
        let header5: Header5ChainHandler = new Header5ChainHandler(document);
        let header6: Header6ChainHandler = new Header6ChainHandler(document);
        let horizontalRule: HorizontalRuleHandler = new HorizontalRuleHandler(document);
        let bullet: BulletChainHandler = new BulletChainHandler(document);
        let paragraph: ParagraphHandler = new ParagraphHandler(document);

        header1.setNext(header2);
        header2.setNext(header3);
        header3.setNext(header4);
        header4.setNext(header5);
        header5.setNext(header6);
        header6.setNext(bullet);
        bullet.setNext(horizontalRule);
        horizontalRule.setNext(paragraph);

        return header1;
    }
}

class Markdown {
    public ToHtml(text: string): string {
        let document: IMarkdownDocument = new MardownDocument();
        let header1 : Header1ChainHandler = new ChainOfResponsabilityFactory().Build(document);
        let lines: string[] = text.split('\n');
        for (let index = 0; index < lines.length; index++) {
            let parseElement: ParseElement = new ParseElement();
            parseElement.CurrentLine = lines[index];
            header1.HandleRequest(parseElement);
        }

        return document.Get();
    }
}

class HtmlHandler {
    private markdownChange: Markdown = new Markdown;
    public TextChangeHandler(id: string, output: string): void {
        let markdown = <HTMLTextAreaElement>document.getElementById(id);
        let markdownOutput = <HTMLLabelElement>document.getElementById(output);

        if (markdown !== null) {
            markdown.onkeyup = (e) => {
                this.RenderHtmlContent(markdown, markdownOutput);
            }
            //if a user paste content with a mouse, we consider the text added
            markdown.onpaste = (e) => {
                this.RenderHtmlContent(markdown, markdownOutput)
            }
            window.onload = (e) => {
                this.RenderHtmlContent(markdown, markdownOutput);
            }
        }
    }

    private RenderHtmlContent(markdown: HTMLTextAreaElement, markdownOutput: HTMLLabelElement) {
        if(markdown.value) {
            markdownOutput.innerHTML = this.markdownChange.ToHtml(markdown.value);
        }
        else {
            markdownOutput.innerHTML= "<p></p>";
        }
    }
}

