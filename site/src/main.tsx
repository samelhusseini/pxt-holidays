


import * as React from "react";
import * as ReactDOM from "react-dom";

import { Header, Menu, Icon, Button, Sidebar, Segment, Dimmer, Loader, Form, Input, Container, Grid, List, Modal } from "semantic-ui-react";

import { MainSidebar } from "./sidebar";

declare let snowFall: any;

declare let Tone: any;

declare let ga: any;

export interface MainAppProps {
}

export interface MainAppState {
    sidebarVisible?: boolean;
    isLoading?: boolean;
    isSharing?: boolean;
    shareURL?: string;
    loadShareURL?: string;
    isCreditsOpen?: boolean;
}

export class MainApp extends React.Component<MainAppProps, MainAppState> {

    private editorFrame: HTMLIFrameElement;

    private projects: any;
    private filters: any;

    private game: any;

    private currentProject: any;
    private loaded: boolean;

    constructor(props: MainAppProps) {
        super(props);

        const shareURL = window.location.hash ? window.location.hash.substring(3) : undefined;
        this.state = {
            isLoading: true,
            loadShareURL: shareURL,
            shareURL: undefined,
            isSharing: !!shareURL
        }

        this.initDefaultProject();

        this.filters = {
            "namespaces": {
                "lists": 0,
                "text": 0
            },
            "blocks": {
                "array_push": 0,
                "array_pop": 0,
                "array_reverse": 0,
                "array_shift": 0,
                "array_unshift": 0,
                "array_removeat": 0,
                "array_insertAt": 0,
                "array_indexof": 0,
                "string_get": 0,
                "string_concat": 0,
                "text_length": 0,
                "string_compare": 0,
                "string_substr": 0,
                "string_parseint": 0,
                "stringFromCharCode": 0,
                "device_random": 0
            },
            "fns": {
            }
        }
    }

    initDefaultProject() {
        this.projects = [
            {
                "text": {
                    "main.blocks": "<xml xmlns=\"http://www.w3.org/1999/xhtml\">\n  <block type=\"device_forever\" x=\"0\" y=\"0\">\n    <statement name=\"HANDLER\">\n     <block type=\"setBackground\" >\n        <value name=\"color\">\n          <shadow type=\"colorNumberPicker\">\n            <field name=\"value\">0xff0000</field>\n          </shadow>\n        </value>\n        <next>\n  <block type=\"say\">\n        <value name=\"text\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">Happy Holidays!</field>\n          </shadow>\n        </value>\n      </block>\n    </statement>\n  </block>\n</xml>",
                    "main.ts": "\n",
                    "README.md": " ",
                    "pxt.json": "{\n    \"name\": \"Untitled\",\n    \"dependencies\": {\n        \"core\": \"*\"\n    },\n    \"description\": \"\",\n    \"files\": [\n        \"main.blocks\",\n        \"main.ts\",\n        \"README.md\"\n    ]\n}"
                }
            }];
    }

    componentDidMount() {
        window.addEventListener("message", this.receiveMessage.bind(this), false);
        window.addEventListener("resize", this.resize.bind(this), false);
        this.resize();
    }

    // resize(setHeight?: number) {
    //     const fullHeight = window.innerHeight;
    //     const fullWidth = window.innerWidth;

    //     const additionalTopPadding = 40;
    //     const defaultPadding = 15;
    //     const maxHeight = fullHeight / (this.state.isSharing ? 1.5 : 2) - (defaultPadding * 2) - (additionalTopPadding);

    //     let ratio = 0.4;
    //     let hasTop = false;

    //     let newWidth = fullWidth / 2;
    //     let newHeight = newWidth / 4 * 3;

    //     if (newHeight > maxHeight) {
    //         newHeight = maxHeight;
    //         newWidth = (newHeight / 3 * 4);
    //         hasTop = true;
    //     }

    //     // Center the frame
    //     const left = (fullWidth / 2) - (newWidth / 2);
    //     const top = (fullHeight / 4) - (newHeight / 2);

    //     const contentFrame = document.getElementById('contentFrame');
    //     contentFrame.style.height = `${newHeight}px`;
    //     contentFrame.style.width = `${newWidth}px`;
    //     contentFrame.style.left = `${left}px`;
    //     const newTop = hasTop ? top + additionalTopPadding / 2 : defaultPadding + additionalTopPadding;
    //     contentFrame.style.top = `${newTop}px`;

    //     // Resize the editor workspace

    //     const scale = 0.3 + (fullWidth / 1000 * 0.3);
    //     this.sendMessage("setscale", {
    //         scale: scale
    //     });

    //     const innerCard = document.getElementById('inner-card');
    //     this.sendMessage("proxytosim", {
    //         type: "resize",
    //         top: newTop + innerCard.offsetTop + 15,
    //         left: left + innerCard.offsetLeft + 15,
    //         width: innerCard.offsetWidth + 20,
    //         height: innerCard.offsetHeight + 20
    //     });
    // }

    isSharing() {
        return this.state.isSharing;
    }

    resize(setHeight?: number) {
        const fullHeight = window.innerHeight;
        const fullWidth = window.innerWidth;

        const additionalTopPadding = 40;
        const defaultPadding = 15;
        const maxHeight = fullHeight / (this.isSharing() ? 1.5 : 2) - (defaultPadding * 2) - (additionalTopPadding);

        let ratio = 0.4;
        let hasTop = false;

        let newWidth = fullWidth / 2 - fullWidth / 8;
        let newHeight = newWidth / 4 * 3;

        /*
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = (newHeight / 3 * 4);
            hasTop = true;
        }*/

        // Center the frame
        const left = !this.isSharing() ? (fullWidth / 2) + (newWidth / 6) : (fullWidth / 2) - newWidth / 2;
        const top = (fullHeight / 4) - (newHeight / 2);

        const contentFrame = document.getElementById('contentFrame');
        contentFrame.style.height = `${newHeight}px`;
        contentFrame.style.width = `${newWidth}px`;
        contentFrame.style.left = `${left}px`;
        const newTop = hasTop ? top + additionalTopPadding / 2 : defaultPadding + additionalTopPadding;
        contentFrame.style.top = `${newTop}px`;

        // Resize the editor workspace

        const scale = 0.3 + (fullWidth / 1000 * 0.3);
        this.sendMessage("setscale", {
            scale: scale
        });

        const innerCard = document.getElementById('inner-card');
        this.sendMessage("proxytosim", {
            type: "resize",
            top: newTop + innerCard.offsetTop + 15,
            left: left + innerCard.offsetLeft + 15,
            width: innerCard.offsetWidth + 20,
            height: innerCard.offsetHeight + 20
        });
    }

    toggleTrace() {
        this.sendMessage("toggletrace", {
        });
    }

    sendMessage(action: string, args: Object) {
        let editor = this.editorFrame.contentWindow;
        var msg = {
            type: "pxteditor",
            id: Math.random().toString(),
            action: action,
            ...args
        };
        editor.postMessage(msg, "*")
    }

    receiveMessage(ev: MessageEvent) {
        let editor = this.editorFrame.contentWindow;
        var msg = ev.data;
        // console.log('received...')
        // console.log(msg)
        if (msg.type == "pxthost") {
            switch (msg.action) {
                case "workspacesync":
                    // no project
                    msg.response = true;
                    msg.projects = this.projects;
                    msg.editor = {
                        "filters": JSON.parse(JSON.stringify(this.filters)),
                        "searchBar": false,
                        "categories": false
                    }
                    if (this.state.loadShareURL) {
                        this.lookupGist(this.state.loadShareURL)
                            .then((content) => {
                                this.currentProject = {
                                    'text': {
                                        "main.blocks": JSON.parse(content["main.blocks"]['content']),
                                        "main.ts": JSON.parse(content["main.ts"]['content']),
                                        "README.md": " ",
                                        "pxt.json": "{\n    \"name\": \"Untitled\",\n    \"dependencies\": {\n        \"core\": \"*\"\n    },\n    \"description\": \"\",\n    \"files\": [\n        \"main.blocks\",\n        \"main.ts\",\n        \"README.md\"\n    ]\n}"
                                    }
                                }
                            }).then(() => {
                                localStorage.setItem('currentProject', JSON.stringify(this.currentProject));
                                msg.projects = [this.currentProject];
                                // console.log("workspacesync")
                                // console.log(JSON.stringify(this.currentProject, null, 2))
                                editor.postMessage(msg, "*")
                                this.loaded = true;
                                if (!this.state.loadShareURL) this.setState({ isLoading: false });
                            })
                    } else {
                        const currentProject = localStorage.getItem('currentProject');
                        if (currentProject) {
                            this.currentProject = JSON.parse(currentProject);
                            msg.projects = [this.currentProject];
                            // console.log("workspacesync")
                            // console.log(JSON.stringify(this.currentProject, null, 2))
                        }
                        editor.postMessage(msg, "*")
                        this.loaded = true;
                    }
                    return;
                case "workspacesave":
                    // console.log("workspacesave")
                    // console.log(JSON.stringify(msg.project, null, 2))
                    //lastSaved = msg.project;
                    if (this.loaded) {
                        this.currentProject = msg.project;
                        localStorage.setItem('currentProject', JSON.stringify(this.currentProject));
                    } else {
                        this.setState({ isLoading: true });
                    }
                    return;
                case "workspaceloaded":
                    if (!this.state.loadShareURL) this.setState({ isLoading: false });
                    this.resize();
                    return;
                case "simevent":
                    if (msg.subtype == "started") {
                        // remove frame background
                        const frame = document.getElementsByClassName('frame')[0] as HTMLElement;
                        frame.style.backgroundColor = 'transparent';
                        this.resize();
                        //this.toggleTrace();
                        if (this.state.loadShareURL) {
                            this.sendMessage("proxytosim", {
                                type: "hidemaineditor"
                            });
                            if (this.state.isLoading) {
                                this.setState({ isLoading: false });
                                this.beginSharing();
                            }
                        }
                    } else if (msg.subtype == "stopped") {

                    }
                    return;
            }
        }
        if (msg.type == "pxteditor") {
            //var req = pendingMsgs[msg.id];
            // if (req.action == "renderblocks") {
            //     var img = document.createElement("img");
            //     img.src = msg.resp;
            //     logs.appendChild(img)
            // }
        }
        if (msg.type == "custom") {
            const content = msg.content;
            if (content) {
                switch (content.key) {
                    case "init":
                        // Simulator initialized
                        console.log("Simulator init");
                        return;
                }
            }
        }
    }

    startOver() {
        if (this.isSharing()) this.toggleSharing();
        this.initDefaultProject();
        this.sendMessage('importproject', {
            project: JSON.parse(JSON.stringify(this.projects[0])),
            filters: this.filters,
            response: true
        })
        this.toggleTrace();
    }

    private text: string = "";
    private background: string = "FE6666";
    private lightBuffer: string[] = ["0xffce54", "0xed5564", "0xa0d468"];
    private showLights: boolean = false;
    private lightAnimation: number;

    handleFacebook() {
        console.log("sharing with facebook");
        ga('send', 'event', 'Sharing', 'facebook', 'Shared');
        const url = window.location.href;
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        this.popupWindow(fbUrl, "Share on Facebook", 600, 600);
    }

    handleTwitter() {
        console.log("sharing with twitter");
        ga('send', 'event', 'Sharing', 'twitter', 'Shared');
        const url = window.location.href;
        const twitterText = "Check out what I made with @MSMakeCode (experimental)!";
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` +
            `&text=${encodeURIComponent(twitterText)}` +
            `&hashtags=${encodeURIComponent('MakeCode')}`;
        this.popupWindow(twitterUrl, "Share on Facebook", 600, 600);
    }

    componentWillUpdate(nextProps: MainAppProps, nextState: MainAppState) {
        // when the menu becomes visible, setup some handlers so we can close the menu easily
        if (nextState.sidebarVisible == true) {
            document.addEventListener('keydown', this.handlePusherKeyPress.bind(this));
            document.querySelector('.pusher').addEventListener('click', this.handlePusherClick.bind(this));
        }
        else {
            document.removeEventListener('keydown', this.handlePusherKeyPress);
            document.querySelector('.pusher').removeEventListener('click', this.handlePusherClick);
        }
    }

    handlePusherClick() {
        if (this.state.sidebarVisible) {
            this.setState({ sidebarVisible: false });
        }
    }

    handlePusherKeyPress(e: KeyboardEvent) {
        if (e.keyCode === 27 && this.state.sidebarVisible) {
            this.setState({ sidebarVisible: false })
        }
    }

    toggleSidebar() {
        this.setState({ sidebarVisible: !this.state.sidebarVisible });
    }

    private player: any;
    beginSharing() {
        // Begin music
        this.player = new Tone.Player("/sounds/Jingle_Bells_Instrumental.mp3").toMaster();
        this.player.autostart = true;
        // Begin snowing
        setTimeout(() => {
            snowFall.snow(document.body, { round: true, shadow: true, maxSpeed: 5, flakeCount: 10, minSize: 3, maxSize: 8 });
        }, 1000);
    }

    stopSharing() {
        // Stop the music
        this.player.stop();
        // Clear the snow
        snowFall.snow(document.body, "clear");
    }

    toggleSharing() {
        this.setState({ isSharing: !this.state.isSharing });
        if (!this.state.isSharing) {
            // Create a gist
            this.publishGist();
            this.sendMessage("proxytosim", {
                type: "hidemaineditor"
            });
            this.beginSharing();
        } else {
            window.location.hash = '';
            this.setState({ loadShareURL: undefined });
            this.sendMessage("proxytosim", {
                type: "showmaineditor"
            });
            this.stopSharing();
        }
        setTimeout(() => {
            this.resize();
            setTimeout(() => {
                this.resize();
            }, 1500);
        }, 300);
    }

    play() {
        this.sendMessage("startsimulator", {});
    }

    copy() {
        const copyForm = document.getElementById('share-url') as HTMLInputElement;
        copyForm.focus();
        copyForm.select();

        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
        } catch (err) {
            console.log('Oops, unable to copy');
        }
    }

    publishGist() {
        ga('send', 'event', 'Sharing', 'publish', 'Shared');
        const data = {
            "description": 'My MakeCode Holiday project',
            "public": false,
            "files": {
                "main.blocks": {
                    "content": JSON.stringify(this.currentProject.text['main.blocks'])
                },
                "main.ts": {
                    "content": JSON.stringify(this.currentProject.text['main.ts'])
                }
            }
        };
        const headers: any = {};
        const url = "https://api.github.com/gists";
        fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        }).then((response) => {
            return response.json();
        }).then((json) => {
            console.log(json);
            window.location.hash = `s:${json['id']}`;
            // Set form url to path
            this.setState({ shareURL: window.location.href });
        });
    }

    lookupGist(guid: string): Promise<string> {
        const url = `https://api.github.com/gists/${guid}`;
        //eg: https://api.github.com/gists/945d8adf90573feaa315d8e2074f2433
        return fetch(url, {
            method: 'GET'
        }).then((response) => {
            return response.json();
        }).then((json) => {
            console.log(json);
            return json['files'];
        });
    }

    popupWindow(url: string, title: string, width: number, height: number) {
        return window.open(url, title, `resizable=no, copyhistory=no, ` +
            `width=${width}, height=${height}, top=${(screen.height / 2) - (height / 2)}, left=${(screen.width / 2) - (width / 2)}`);
    }

    render() {
        const { sidebarVisible, isLoading, isSharing, shareURL, loadShareURL, isCreditsOpen } = this.state;

        return <Sidebar.Pushable>
            <Sidebar as={Menu} animation='scale down' width='thin' visible={sidebarVisible} icon='labeled' vertical inverted>
                <Menu.Item name='home' onClick={() => this.setState({ sidebarVisible: false })}>
                    <Icon name='home' />
                    Home
        </Menu.Item>
                <Menu.Item name='terms'>
                    <Icon name='legal' />
                    Terms
        </Menu.Item>
                <Menu.Item name='privacy'>
                    <Icon name='privacy' />
                    Privacy Policy
        </Menu.Item>
                <Menu.Item name='credits' onClick={() => this.setState({ isCreditsOpen: true, sidebarVisible: false })}>
                    <Icon name='align justify' />
                    About
        </Menu.Item>
            </Sidebar>
            <Sidebar.Pusher dimmed={sidebarVisible}>
                {isLoading ? <Dimmer active>
                    <Loader size="large" />
                </Dimmer> : undefined}
                <Menu fixed="top" borderless size="mini">
                    <Menu.Item onClick={this.toggleSidebar.bind(this)}>
                        <Icon name="sidebar" size="large" style={{ color: '#F6252D' }} />
                    </Menu.Item>
                    {!isSharing ? <Menu.Item onClick={this.startOver.bind(this)}>
                        <Button color="red" content="Start Over" />
                    </Menu.Item> : undefined}
                    <Menu.Menu position='right'>
                        <Menu.Item name='twitter' onClick={this.handleTwitter.bind(this)}>
                            <Icon name='twitter' size="large" style={{ color: '#00aced' }} />
                        </Menu.Item>
                        <Menu.Item name='facebook' onClick={this.handleFacebook.bind(this)}>
                            <Icon name='facebook' size="large" style={{ color: '#3b5998' }} />
                        </Menu.Item>
                    </Menu.Menu>
                </Menu>
                <iframe ref={e => this.editorFrame = e} id="iframe" src="index.html?editorlayout=ide"></iframe>
                <div className="left-back" />

                {isSharing ? <div className="back-button">
                    <Button color="purple" circular size="huge" icon='edit' labelPosition='left' content='Remix' onClick={this.toggleSharing.bind(this)} />
                </div> : undefined}
                <div id="contentFrame" className={`card-content`} style={{ transition: isSharing ? 'all 1s' : '' }}>
                    <div className="shadow"></div>
                    <div className="frame">
                        <div id="inner-card" className="inner-card">
                        </div>
                    </div>
                </div>

                <div className="right-back" />
                {!isSharing && !loadShareURL ? <div className="sim-buttons">
                    <Grid divided inverted stackable centered>
                        <Grid.Row>
                            <Grid.Column width={8} textAlign="center">
                                <div className="play-button">
                                    <Button color="green" circular size="massive" icon='play' onClick={this.play.bind(this)} />
                                </div>
                            </Grid.Column>
                            <Grid.Column width={8} textAlign="center">
                                <div className="share-button">
                                    <Button color="red" circular size="huge" icon='right arrow' labelPosition='right' content='Share' onClick={this.toggleSharing.bind(this)} />
                                </div>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </div> : undefined}

                {isSharing && shareURL ? <div className="sharing-dialog ui container text">
                    <Form size='huge'>
                        <Form.Field>
                            <Input
                                label={<Button content='Copy' color='green' onClick={this.copy.bind(this)} />}
                                labelPosition='right'
                                id="share-url"
                                value={shareURL} />
                        </Form.Field>
                    </Form>
                </div> : undefined}


                {isSharing ?
                    <div />
                    : undefined}


                {isSharing ? <Segment className="sharing-footer" inverted vertical style={{ padding: '1em 0em' }}>
                    <Container>
                        <Grid divided inverted stackable centered>
                            <Grid.Row>
                                <Grid.Column width={16} textAlign="center">
                                    <Header as='h4' inverted>Powered by <a href="https://www.makecode.com" target="_blank" style={{ color: '#b4019E' }}>Microsoft MakeCode</a></Header>
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Container>
                </Segment> : undefined}

                {isLoading ? <div className="loading-screen" /> : undefined}

                <Modal open={isCreditsOpen} closeIcon={true} onClose={() => this.setState({ isCreditsOpen: false })} dimmer={true}>
                    <Modal.Header>About</Modal.Header>
                    <Modal.Content>
                        <Modal.Description>
                            <p>A Blocks / JavaScript code editor for the holidays powered by <a href="www.makecode.com" target="_blank">Microsoft MakeCode.</a></p>
                            <p><a href="https://github.com/microsoftsam/pxt-holidays" target="_blank">microsoftsam.github.io/pxt-holidays</a> version: 0.0.1</p>
                            <p>Microsoft MakeCode version: 2.2.4</p>

                            <b> Built with:</b>
                            <List bulleted>
                                <List.Item> Microsoft MakeCode: <a href="https://github.com/Microsoft/pxt" target="_blank">https://github.com/Microsoft/pxt</a> </List.Item>
                                <List.Item> Semantic UI Less: <a href="https://github.com/Semantic-Org/Semantic-UI-LESS" target="_blank">https://github.com/Semantic-Org/Semantic-UI-LESS</a></List.Item>
                                <List.Item> Semantic UI React: <a href="https://github.com/Semantic-Org/Semantic-UI-React" target="_blank">https://github.com/Semantic-Org/Semantic-UI-React </a></List.Item>
                                <List.Item>Icons made by <a href="https://www.freepik.com/" target="_blank">Freepik</a> from <a href="www.flaticon.com" target="_blank">www.flaticon.com</a></List.Item>
                                <List.Item>Kwanzaa icons from: <a rel="nofollow" href="https://www.Vecteezy.com/">Vector Art by www.vecteezy.com</a></List.Item>
                            </List>
                        </Modal.Description>
                    </Modal.Content>
                </Modal>
            </Sidebar.Pusher>
        </Sidebar.Pushable>;
    }
}

ReactDOM.render(
    <MainApp />,
    document.getElementById("root")
);