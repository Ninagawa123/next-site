import Link from 'next/link'
import Header from '../components/header'
import Content from '../components/content'

export default function About() {
    return (
        <>
                  <Content>
            
            <Header title="よしよし"/>
            <h1>About</h1>
                <Link href={'/'}><button>トップへ</button></Link>
                                <br/>
                <br/>
                <br/>

                      </Content>
                
        </>
    )
}