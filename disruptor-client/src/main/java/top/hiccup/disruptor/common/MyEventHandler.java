package top.hiccup.disruptor.common;

import com.lmax.disruptor.EventHandler;
import top.hiccup.disruptor.perftest.Common;
import top.hiccup.disruptor.perftest.PerfDisruptorTest;

import java.util.concurrent.CountDownLatch;

/**
 * Created by wenhy on 2018/1/9.
 */
public class MyEventHandler implements EventHandler<MyEvent> {

    private CountDownLatch latch;

    public MyEventHandler(CountDownLatch latch) {
        this.latch = latch;
    }

    /**
     * 基于事件通知的模型，Disruptor接收到消息就调用此方法，通知消费者消费，也可以理解为观察者模式
     *
     * @param myEvent
     * @param sequence
     * @param endOfBatch
     * @throws Exception
     */
    @Override
    public void onEvent(MyEvent myEvent, long sequence, boolean endOfBatch) throws Exception {
        // TODO 小插曲，这里打印到控制台会非常影响队列的性能测试结果
//        System.out.print(" " + myEvent.getEventId());

        if (myEvent.getEventId() == Common.DATA_SIZE) {
            // 消费完成后打印
            long costTime = System.currentTimeMillis() - PerfDisruptorTest.startTime;
            System.out.println("Disruptor耗时：" + costTime);
            long opsPerSecond = (Common.DATA_SIZE * 1000L) / costTime;
            System.out.println("Disruptor每秒吞吐量：" + opsPerSecond);
            System.out.println();
            latch.countDown();
        }
    }
}
