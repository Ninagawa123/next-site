import Head from 'next/head'
import Styles from '../styles/Home.module.css'
import Link from 'next/link'
import Header from './components/header'
import Content from './components/content'
import useSWR from 'swr'

const fetcher = (url) =>
  fetch(url).then(res => res.json())

export default function Home() {
  let title = 'めりてくす予備校'
  const { data, error } = useSWR('/api/message', fetcher)
  if (error) return <div>failed to load</div>
  if (!data) return <div>loading...</div>



  return(
    <>
      <Content>
      <Head><title>予備校</title></Head>
      <h1 className={Styles.mytitle} style={{ color: 'red', backgroundColor: 'yellow' }}>{ title }</h1>
      <p>{data.message}</p>
      <Header title="よしよしyosi"/>
      <div>
        <Link href="/about">about</Link>
      </div>
      <style jsx>{`
        h1 {
          color: white;
        }
      `}</style>
      <h1>test</h1>
      </Content>
    </>
  )
}